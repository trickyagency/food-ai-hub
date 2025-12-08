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

// Keywords that indicate an order was placed (fallback detection)
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

interface OrderItem {
  name: string;
  quantity: number;
  price?: number;
  modifications?: string;
}

interface CaptureOrderArgs {
  customerName?: string;
  items: OrderItem[];
  subtotal?: number;
  tax?: number;
  total: number;
  specialInstructions?: string;
  estimatedTime?: number;
}

// Function to detect if an order was placed from the call data (fallback)
function detectOrderFromCall(payload: any): { hasOrder: boolean; orderDetails: any } {
  const transcript = payload.transcript || payload.call?.transcript || "";
  const summary = payload.summary || payload.call?.summary || "";
  const analysis = payload.analysis || payload.call?.analysis || {};
  
  const combinedText = `${transcript} ${summary}`.toLowerCase();
  const hasOrderKeyword = ORDER_KEYWORDS.some(keyword => combinedText.includes(keyword));
  
  const structuredOrder = analysis.structuredData?.order || analysis.order || null;
  
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
    orderDetails = {
      items: [],
      total: null,
      estimatedTime: 30,
      customerName: null,
      orderId: null,
    };
  }
  
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

// Function to store order in database
async function storeOrder(
  supabase: any,
  callId: string,
  customerNumber: string,
  orderArgs: CaptureOrderArgs
): Promise<string | null> {
  try {
    const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;
    
    const { data, error } = await supabase
      .from("orders")
      .insert({
        call_id: callId,
        customer_number: customerNumber,
        customer_name: orderArgs.customerName || null,
        items: orderArgs.items,
        subtotal: orderArgs.subtotal || null,
        tax: orderArgs.tax || null,
        total: orderArgs.total,
        special_instructions: orderArgs.specialInstructions || null,
        estimated_time: orderArgs.estimatedTime || 30,
        status: "confirmed",
      })
      .select()
      .single();

    if (error) {
      console.error("Error storing order:", error);
      return null;
    }

    console.log("Order stored successfully:", data.id);
    return orderId;
  } catch (error) {
    console.error("Error in storeOrder:", error);
    return null;
  }
}

// Handle tool-calls (function calling) from Vapi
async function handleToolCall(
  supabase: any,
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: any
): Promise<{ result: string; orderId?: string }> {
  const toolCalls = payload.message?.toolCalls || payload.toolCalls || [];
  const call = payload.message?.call || payload.call || {};
  const callId = call.id || "unknown";
  const customerNumber = call.customer?.number || payload.customer?.number;

  console.log("Processing tool calls:", JSON.stringify(toolCalls, null, 2));

  for (const toolCall of toolCalls) {
    const functionName = toolCall.function?.name || toolCall.name;
    const args = toolCall.function?.arguments || toolCall.arguments || {};

    console.log(`Processing function: ${functionName}`, args);

    if (functionName === "capture_order") {
      // Parse arguments if they're a string
      const orderArgs: CaptureOrderArgs = typeof args === "string" ? JSON.parse(args) : args;

      console.log("Capture order called with:", JSON.stringify(orderArgs, null, 2));

      if (!customerNumber) {
        console.error("No customer number available for SMS");
        return { result: "Order captured but SMS could not be sent - no customer phone number." };
      }

      // Store order in database
      const orderId = await storeOrder(supabase, callId, customerNumber, orderArgs);

      // Build order details for SMS
      const orderDetails = {
        orderId,
        customerName: orderArgs.customerName,
        items: orderArgs.items,
        subtotal: orderArgs.subtotal,
        tax: orderArgs.tax,
        total: orderArgs.total,
        estimatedTime: orderArgs.estimatedTime || 30,
        specialInstructions: orderArgs.specialInstructions,
      };

      // Send SMS immediately (don't wait)
      EdgeRuntime.waitUntil(
        sendOrderConfirmationSMS(
          supabaseUrl,
          supabaseServiceKey,
          customerNumber,
          orderDetails,
          callId
        )
      );

      const itemsSummary = orderArgs.items
        .map(item => `${item.quantity}x ${item.name}`)
        .join(", ");

      return {
        result: `Order confirmed! ${orderArgs.customerName ? `Thank you ${orderArgs.customerName}. ` : ""}Your order for ${itemsSummary} totaling $${orderArgs.total.toFixed(2)} has been placed. Estimated ready time is ${orderArgs.estimatedTime || 30} minutes. A confirmation text has been sent to your phone.`,
        orderId: orderId || undefined,
      };
    }
  }

  return { result: "Function not recognized" };
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

    // Determine event type - check both message.type and direct type
    const eventType = message?.type || payload.type || "unknown";

    console.log("Event type:", eventType);

    // Handle tool-calls event (function calling)
    if (eventType === "tool-calls") {
      console.log("Processing tool-calls event");
      
      const { result, orderId } = await handleToolCall(
        supabase,
        supabaseUrl,
        supabaseServiceKey,
        payload
      );

      // Return the function result to Vapi
      // Vapi expects a specific response format for tool calls
      const toolCallId = payload.message?.toolCalls?.[0]?.id || 
                         payload.toolCalls?.[0]?.id ||
                         "unknown";

      return new Response(
        JSON.stringify({
          results: [
            {
              toolCallId,
              result,
            },
          ],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Extract key data for other event types
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
        user_id: null,
      });

    if (insertError) {
      console.error("Error storing webhook event:", insertError);
      throw insertError;
    }

    console.log(`Successfully stored ${eventType} event for call ${callId}`);

    // Check if this is an end-of-call-report and detect orders (fallback method)
    if (eventType === "end-of-call-report" && customerNumber) {
      console.log("Processing end-of-call-report for potential order confirmation (fallback)");
      
      // Check if order was already captured via function calling
      const { data: existingOrder } = await supabase
        .from("orders")
        .select("id")
        .eq("call_id", callId)
        .maybeSingle();

      if (existingOrder) {
        console.log("Order already captured via function calling, skipping fallback detection");
      } else {
        const { hasOrder, orderDetails } = detectOrderFromCall(payload);
        
        if (hasOrder) {
          console.log("Order detected via fallback! Sending SMS confirmation...");
          
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
