import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderItem {
  name: string;
  quantity: number;
  price?: number;
}

interface CompletionRequest {
  customerNumber: string;
  orderDetails: {
    orderId: string;
    customerName?: string;
    orderType?: 'pickup' | 'delivery';
    deliveryAddress?: string;
    items?: OrderItem[] | string[];
    total?: number;
  };
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
    const { customerNumber, orderDetails, userId }: CompletionRequest = await req.json();

    console.log("Sending completion SMS to:", customerNumber);
    console.log("Order details:", JSON.stringify(orderDetails, null, 2));

    // Validate customer number
    if (!customerNumber) {
      throw new Error("Customer phone number is required");
    }

    // Validate phone number format - must be real digits, not placeholder text
    const cleanedNumber = customerNumber.replace(/\D/g, '');
    const hasPlaceholder = /[A-Za-z]/.test(customerNumber) || customerNumber.includes('XXXX');
    const isFake555Number = cleanedNumber.includes('555') && cleanedNumber.length >= 10;
    
    if (hasPlaceholder || isFake555Number) {
      console.log("Skipping SMS - invalid/test phone number:", customerNumber);
      return new Response(
        JSON.stringify({
          success: true,
          message: "SMS skipped - test/invalid phone number detected",
          skipped: true,
          reason: "Phone number appears to be a test number (contains placeholders or 555 prefix)",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Basic E.164 format validation
    if (cleanedNumber.length < 10 || cleanedNumber.length > 15) {
      throw new Error(`Invalid phone number format: ${customerNumber}. Expected 10-15 digits.`);
    }

    const customerName = orderDetails.customerName || "Valued Customer";
    const orderId = orderDetails.orderId || "N/A";
    const orderType = orderDetails.orderType || 'pickup';

    // Build order type specific message
    let readyMessage = "";
    if (orderType === 'delivery') {
      readyMessage = "Your order is on its way to you!";
    } else {
      readyMessage = "Please visit us to pick up your order.";
    }

    const messageBody = `✅ Your Order is Ready!

Hi ${customerName},

Great news! Your order #${orderId} is now ready for ${orderType}!

${readyMessage}

Thank you for choosing us! We hope you enjoy your order.

💬 We'd love to hear from you! Please take a moment to share your experience and feedback.

- Voice AI SmartFlow Automation`;

    // Create SMS log entry
    const { data: logEntry, error: logError } = await supabase
      .from("sms_logs")
      .insert({
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

    console.log("Completion SMS sent successfully:", twilioResult.sid);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Completion SMS sent successfully",
        twilioSid: twilioResult.sid,
        logId: logEntry?.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error sending completion SMS:", error);
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
