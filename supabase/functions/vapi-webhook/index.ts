import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

// Declare EdgeRuntime for Supabase background tasks
declare const EdgeRuntime: {
  waitUntil: (promise: Promise<any>) => void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Keywords that indicate an order was placed
const ORDER_KEYWORDS = [
  "order confirmed",
  "order placed",
  "order received",
  "placed your order",
  "confirmed your order",
  "order is confirmed",
  "i've placed",
  "i have placed",
  "your order has been",
  "order number",
  "order total",
  "thank you for your order",
  "order will be ready",
];

// Function to detect if an order was placed from the call data
function detectOrderFromCall(payload: any): { hasOrder: boolean; orderDetails: any } {
  const transcript = payload.transcript || payload.call?.transcript || "";
  const summary = payload.summary || payload.call?.summary || "";
  const analysis = payload.analysis || payload.call?.analysis || {};
  
  // Check transcript and summary for order keywords
  const combinedText = `${transcript} ${summary}`.toLowerCase();
  const hasOrderKeyword = ORDER_KEYWORDS.some(keyword => combinedText.includes(keyword));
  
  // Check analysis for structured order data
  const structuredOrder = analysis.structuredData?.order || analysis.order || null;
  
  // Extract order details from analysis or try to parse from transcript
  let orderDetails: any = {};
  
  if (structuredOrder) {
    orderDetails = {
      items: structuredOrder.items || [],
      total: structuredOrder.total || structuredOrder.orderTotal,
      estimatedTime: structuredOrder.estimatedTime || structuredOrder.prepTime || 30,
      customerName: structuredOrder.customerName,
      orderId: structuredOrder.orderId,
    };
  } else if (hasOrderKeyword) {
    // Try to extract basic order info from the call
    orderDetails = {
      items: [],
      total: null,
      estimatedTime: 30,
      customerName: null,
      orderId: null,
    };
  }
  
  // Determine if we should send an SMS
  const hasOrder = hasOrderKeyword || structuredOrder !== null;
  
  console.log("Order detection result:", { hasOrder, hasOrderKeyword, hasStructuredOrder: !!structuredOrder });
  
  return { hasOrder, orderDetails };
}

// Function to send SMS via the twilio-sms edge function
async function sendOrderConfirmationSMS(
  supabaseUrl: string,
  supabaseServiceKey: string,
  customerNumber: string,
  orderDetails: any,
  callId: string
): Promise<void> {
  try {
    console.log("Triggering SMS for order confirmation to:", customerNumber);
    
    const response = await fetch(`${supabaseUrl}/functions/v1/twilio-sms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        customerNumber,
        orderDetails,
        callId,
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error("Failed to send SMS:", result);
    } else {
      console.log("SMS sent successfully:", result);
    }
  } catch (error) {
    console.error("Error calling twilio-sms function:", error);
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    console.log("Received Vapi webhook event:", JSON.stringify(payload, null, 2));

    const {
      message,
      call,
      phoneNumber,
      customer,
      transcript,
      endedReason,
      cost,
      costBreakdown,
      duration,
      status,
    } = payload;

    // Determine event type
    const eventType = message?.type || "unknown";

    // Extract key data
    const callId = call?.id || payload.call?.id || "unknown";
    const assistantId = call?.assistantId || payload.assistantId;
    const phoneNumberId = phoneNumber?.id || call?.phoneNumberId;
    const customerNumber = customer?.number || call?.customer?.number;

    // Store the event
    const { error: insertError } = await supabase
      .from("vapi_call_events")
      .insert({
        event_id: payload.id,
        call_id: callId,
        event_type: eventType,
        payload: payload,
        assistant_id: assistantId,
        phone_number_id: phoneNumberId,
        customer_number: customerNumber,
        transcript_text: transcript || payload.transcript,
        call_status: status || call?.status,
        duration: duration,
        cost: cost,
        user_id: null, // Will be set by trigger or manual association
      });

    if (insertError) {
      console.error("Error storing webhook event:", insertError);
      throw insertError;
    }

    console.log(`Successfully stored ${eventType} event for call ${callId}`);

    // Check if this is an end-of-call-report and detect orders
    if (eventType === "end-of-call-report" && customerNumber) {
      console.log("Processing end-of-call-report for potential order confirmation");
      
      const { hasOrder, orderDetails } = detectOrderFromCall(payload);
      
      if (hasOrder) {
        console.log("Order detected! Sending SMS confirmation...");
        
        // Send SMS in background (don't await to avoid blocking webhook response)
        EdgeRuntime.waitUntil(
          sendOrderConfirmationSMS(
            supabaseUrl,
            supabaseServiceKey,
            customerNumber,
            orderDetails,
            callId
          )
        );
      } else {
        console.log("No order detected in this call");
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Webhook processed" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
