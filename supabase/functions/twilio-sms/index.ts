import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SMSRequest {
  customerNumber: string;
  orderDetails: {
    items?: string[];
    total?: number;
    estimatedTime?: number;
    customerName?: string;
    orderId?: string;
  };
  callId?: string;
  userId?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      throw new Error("Twilio credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { customerNumber, orderDetails, callId, userId }: SMSRequest = await req.json();

    console.log("Sending SMS to:", customerNumber);
    console.log("Order details:", JSON.stringify(orderDetails, null, 2));

    // Validate customer number
    if (!customerNumber) {
      throw new Error("Customer phone number is required");
    }

    // Format the order confirmation message
    const customerName = orderDetails.customerName || "Valued Customer";
    const items = orderDetails.items?.join("\n• ") || "Your order items";
    const total = orderDetails.total ? `$${orderDetails.total.toFixed(2)}` : "See receipt";
    const estimatedTime = orderDetails.estimatedTime || 30;
    const orderId = orderDetails.orderId || `ORD-${Date.now().toString(36).toUpperCase()}`;

    const messageBody = `🍕 Order Confirmed!

Hi ${customerName},

Your order #${orderId} has been received:
• ${items}

Total: ${total}
Est. Time: ${estimatedTime} mins

Thank you for ordering with us!
- Smartflow Restaurant`;

    // Create SMS log entry first (pending status)
    const { data: logEntry, error: logError } = await supabase
      .from("sms_logs")
      .insert({
        call_id: callId,
        customer_number: customerNumber,
        message_content: messageBody,
        order_details: orderDetails,
        status: "pending",
        user_id: userId || null,
      })
      .select()
      .single();

    if (logError) {
      console.error("Error creating SMS log:", logError);
    }

    // Send SMS via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const authHeader = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const formData = new URLSearchParams();
    formData.append("To", customerNumber);
    formData.append("From", twilioPhoneNumber);
    formData.append("Body", messageBody);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const twilioResult = await twilioResponse.json();
    console.log("Twilio response:", JSON.stringify(twilioResult, null, 2));

    // Update SMS log with result
    if (logEntry?.id) {
      if (twilioResponse.ok) {
        await supabase
          .from("sms_logs")
          .update({
            twilio_sid: twilioResult.sid,
            status: "sent",
          })
          .eq("id", logEntry.id);
      } else {
        await supabase
          .from("sms_logs")
          .update({
            status: "failed",
            error_message: twilioResult.message || "Failed to send SMS",
          })
          .eq("id", logEntry.id);
      }
    }

    if (!twilioResponse.ok) {
      console.error("Twilio error:", twilioResult);
      throw new Error(twilioResult.message || "Failed to send SMS");
    }

    console.log("SMS sent successfully:", twilioResult.sid);

    return new Response(
      JSON.stringify({
        success: true,
        message: "SMS sent successfully",
        twilioSid: twilioResult.sid,
        logId: logEntry?.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error sending SMS:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
