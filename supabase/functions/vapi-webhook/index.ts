import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Idempotency cache to prevent duplicate order processing
const processedOrders = new Map<string, number>();
const IDEMPOTENCY_TTL = 5 * 60 * 1000; // 5 minutes

function cleanupOldEntries() {
  const now = Date.now();
  for (const [key, timestamp] of processedOrders.entries()) {
    if (now - timestamp > IDEMPOTENCY_TTL) {
      processedOrders.delete(key);
    }
  }
}

function validateOrderTotal(items: any[], statedTotal: number): { valid: boolean; calculatedTotal: number } {
  if (!Array.isArray(items)) return { valid: false, calculatedTotal: 0 };
  
  const calculatedTotal = items.reduce((sum, item) => {
    const price = parseFloat(item.price) || 0;
    const quantity = parseInt(item.quantity) || 1;
    return sum + (price * quantity);
  }, 0);
  
  // Allow 1% tolerance for rounding differences
  const tolerance = Math.max(0.01, statedTotal * 0.01);
  const valid = Math.abs(calculatedTotal - statedTotal) <= tolerance;
  
  return { valid, calculatedTotal };
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

    // Validate webhook secret if configured
    const webhookSecret = Deno.env.get("VAPI_WEBHOOK_SECRET");
    if (webhookSecret) {
      const url = new URL(req.url);
      const tokenFromQuery = url.searchParams.get("token");
      const tokenFromHeader = req.headers.get("x-webhook-secret");
      
      if (tokenFromQuery !== webhookSecret && tokenFromHeader !== webhookSecret) {
        console.error("Invalid webhook secret");
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const payload = await req.json();
    console.log("Received webhook payload:", JSON.stringify(payload, null, 2));

    const eventType = payload.message?.type || payload.type || "unknown";
    const callId = payload.message?.call?.id || payload.call?.id;
    
    // Validate required fields
    if (!callId) {
      console.error("Missing call ID in payload");
      return new Response(JSON.stringify({ error: "Missing call ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Whitelist allowed event types
    const allowedEvents = [
      "status-update", 
      "transcript", 
      "end-of-call-report", 
      "function-call",
      "assistant-request",
      "tool-calls"
    ];
    
    if (!allowedEvents.includes(eventType)) {
      console.log(`Ignoring event type: ${eventType}`);
      return new Response(JSON.stringify({ success: true, ignored: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callData = payload.message?.call || payload.call || {};
    const customerNumber = callData.customer?.number || null;
    const assistantId = callData.assistantId || callData.assistant?.id || null;
    const phoneNumberId = callData.phoneNumberId || null;

    // Store call event
    const { error: eventError } = await supabase.from("vapi_call_events").insert({
      call_id: callId,
      event_type: eventType,
      payload: payload,
      customer_number: customerNumber,
      assistant_id: assistantId,
      phone_number_id: phoneNumberId,
      call_status: callData.status || null,
      duration: callData.duration || null,
      cost: callData.cost || null,
      transcript_text: payload.message?.transcript || null,
    });

    if (eventError) {
      console.error("Error storing call event:", eventError);
    }

    // Handle function calls for order capture
    if (eventType === "function-call" || eventType === "tool-calls") {
      const functionCall = payload.message?.functionCall || payload.functionCall;
      const toolCalls = payload.message?.toolCalls || payload.toolCalls;
      
      let orderData = null;
      let functionName = "";

      if (functionCall && functionCall.name === "capture_order") {
        functionName = functionCall.name;
        orderData = functionCall.parameters;
      } else if (toolCalls && Array.isArray(toolCalls)) {
        const orderTool = toolCalls.find((t: any) => 
          t.function?.name === "capture_order" || t.name === "capture_order"
        );
        if (orderTool) {
          functionName = orderTool.function?.name || orderTool.name;
          orderData = orderTool.function?.arguments || orderTool.arguments;
          if (typeof orderData === "string") {
            try {
              orderData = JSON.parse(orderData);
            } catch (e) {
              console.error("Failed to parse tool arguments:", e);
            }
          }
        }
      }

      if (orderData && functionName === "capture_order") {
        console.log("Processing order capture:", orderData);
        
        // Idempotency check - prevent duplicate orders
        cleanupOldEntries();
        const idempotencyKey = `${callId}_${JSON.stringify(orderData.items || []).slice(0, 100)}`;
        
        if (processedOrders.has(idempotencyKey)) {
          console.log("Duplicate order detected, skipping:", idempotencyKey);
          return new Response(JSON.stringify({ 
            success: true, 
            message: "Order already processed",
            duplicate: true 
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Validate order data
        const items = Array.isArray(orderData.items) ? orderData.items : [];
        const statedTotal = parseFloat(orderData.total) || 0;
        
        // Validate total matches items
        const { valid: totalValid, calculatedTotal } = validateOrderTotal(items, statedTotal);
        
        if (!totalValid && items.length > 0) {
          console.warn(`Order total mismatch: stated=${statedTotal}, calculated=${calculatedTotal}`);
          // Use calculated total if mismatch is significant
          orderData.total = calculatedTotal;
        }

        // Calculate subtotal and tax if not provided
        const subtotal = parseFloat(orderData.subtotal) || calculatedTotal;
        const tax = parseFloat(orderData.tax) || (subtotal * 0.0825); // 8.25% default tax
        const finalTotal = parseFloat(orderData.total) || (subtotal + tax);

        const orderRecord = {
          call_id: callId,
          customer_name: orderData.customer_name || callData.customer?.name || null,
          customer_number: customerNumber || orderData.customer_number,
          items: items,
          subtotal: subtotal,
          tax: tax,
          total: finalTotal,
          status: "confirmed",
          special_instructions: orderData.special_instructions || null,
          estimated_time: parseInt(orderData.estimated_time) || 30,
        };

        // Validate required fields
        if (!orderRecord.customer_number) {
          console.error("Missing customer number for order");
          return new Response(JSON.stringify({ 
            error: "Missing customer number",
            success: false 
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: order, error: orderError } = await supabase
          .from("orders")
          .insert(orderRecord)
          .select()
          .single();

        if (orderError) {
          console.error("Error creating order:", orderError);
          return new Response(JSON.stringify({ 
            error: orderError.message,
            success: false 
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Mark as processed for idempotency
        processedOrders.set(idempotencyKey, Date.now());

        console.log("Order created successfully:", order.id);

        // Send SMS confirmation
        try {
          const smsResponse = await fetch(
            `${supabaseUrl}/functions/v1/twilio-sms`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                to: orderRecord.customer_number,
                orderId: order.id,
                customerName: orderRecord.customer_name,
                items: orderRecord.items,
                total: orderRecord.total,
                estimatedTime: orderRecord.estimated_time,
                callId: callId,
              }),
            }
          );

          const smsResult = await smsResponse.json();
          console.log("SMS send result:", smsResult);
          
          if (!smsResponse.ok) {
            console.error("SMS send failed:", smsResult);
            // Don't fail the order creation if SMS fails
          }
        } catch (smsError) {
          console.error("Error sending SMS:", smsError);
          // Don't fail the order creation if SMS fails
        }

        return new Response(JSON.stringify({ 
          success: true, 
          orderId: order.id,
          message: "Order captured successfully"
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Handle end-of-call-report for call data sync
    if (eventType === "end-of-call-report") {
      const { error: callError } = await supabase.from("vapi_calls").upsert(
        {
          id: callId,
          status: callData.status || "ended",
          customer_number: customerNumber,
          customer_name: callData.customer?.name || null,
          assistant_id: assistantId,
          phone_number_id: phoneNumberId,
          phone_number: callData.phoneNumber?.number || null,
          type: callData.type || null,
          duration: callData.duration || null,
          cost: callData.cost || null,
          cost_breakdown: callData.costs || null,
          started_at: callData.startedAt || null,
          ended_at: callData.endedAt || null,
          ended_reason: callData.endedReason || null,
          transcript: payload.message?.transcript || callData.transcript || null,
          summary: payload.message?.summary || callData.summary || null,
          recording_url: callData.recordingUrl || null,
          analysis: payload.message?.analysis || callData.analysis || null,
          messages: callData.messages || null,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      if (callError) {
        console.error("Error syncing call data:", callError);
      } else {
        console.log("Call data synced successfully for:", callId);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage, success: false }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});