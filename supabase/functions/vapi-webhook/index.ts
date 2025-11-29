import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
