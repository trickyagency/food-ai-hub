import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface TestOrderPayload {
  customer_name: string;
  customer_number: string;
  order_type: "pickup" | "delivery";
  delivery_address?: string | null;
  items: OrderItem[];
  special_instructions?: string | null;
  estimated_time: number;
  send_sms: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role for database operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user's JWT
    const supabaseAuth = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !userData.user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid authorization token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;
    console.log(`Test order requested by user: ${userId}`);

    // Check if user has admin/owner role
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (roleError || !roleData) {
      console.error("Role check error:", roleError);
      return new Response(
        JSON.stringify({ success: false, error: "Could not verify user role" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["owner", "admin"].includes(roleData.role)) {
      return new Response(
        JSON.stringify({ success: false, error: "Only admins and owners can create test orders" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const payload: TestOrderPayload = await req.json();
    console.log("Test order payload:", JSON.stringify(payload, null, 2));

    // Validate required fields
    if (!payload.customer_name || !payload.customer_number) {
      return new Response(
        JSON.stringify({ success: false, error: "Customer name and phone number are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!payload.items || payload.items.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "At least one order item is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate totals
    const subtotal = payload.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const taxRate = 0.0825; // 8.25% tax
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    // Generate test call ID
    const callId = `test-${Date.now()}`;

    // Insert order into database
    const orderData = {
      call_id: callId,
      customer_name: payload.customer_name,
      customer_number: payload.customer_number,
      order_type: payload.order_type || "pickup",
      delivery_address: payload.delivery_address || null,
      items: payload.items,
      special_instructions: payload.special_instructions || null,
      estimated_time: payload.estimated_time || 30,
      subtotal: Number(subtotal.toFixed(2)),
      tax: Number(tax.toFixed(2)),
      total: Number(total.toFixed(2)),
      status: "confirmed",
      user_id: userId,
    };

    console.log("Inserting order:", JSON.stringify(orderData, null, 2));

    const { data: insertedOrder, error: insertError } = await supabase
      .from("orders")
      .insert(orderData)
      .select()
      .single();

    if (insertError) {
      console.error("Order insert error:", insertError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to insert order: ${insertError.message}`,
          details: insertError
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Order inserted successfully:", insertedOrder.id);

    // Record initial status in order history
    const { error: historyError } = await supabase
      .from("order_status_history")
      .insert({
        order_id: insertedOrder.id,
        new_status: "confirmed",
        previous_status: null,
        changed_by: userId,
        changed_by_email: userData.user.email,
        notes: "Test order created",
      });

    if (historyError) {
      console.warn("Failed to record order history:", historyError);
    }

    // Optionally send SMS
    let smsResult = null;
    if (payload.send_sms) {
      console.log("Sending SMS confirmation...");
      try {
        // Format items for SMS
        const itemsList = payload.items
          .map((item) => `${item.quantity}x ${item.name} ($${item.price.toFixed(2)})`)
          .join("\n");

        const smsMessage = `🍔 Order Confirmed!\n\nHi ${payload.customer_name}!\n\nYour order:\n${itemsList}\n\nSubtotal: $${subtotal.toFixed(2)}\nTax: $${tax.toFixed(2)}\nTotal: $${total.toFixed(2)}\n\n${payload.order_type === "delivery" ? `Delivery to: ${payload.delivery_address}\n` : ""}Est. time: ${payload.estimated_time} min\n\nThank you for your order!`;

        // Call twilio-sms function
        const smsResponse = await fetch(
          `${supabaseUrl}/functions/v1/twilio-sms`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              to: payload.customer_number,
              message: smsMessage,
              callId: callId,
              orderDetails: {
                customer_name: payload.customer_name,
                items: payload.items,
                total: total,
              },
            }),
          }
        );

        const smsData = await smsResponse.json();
        smsResult = {
          sent: smsData.success || smsData.skipped,
          skipped: smsData.skipped || false,
          sid: smsData.messageSid,
          error: smsData.error,
        };
        console.log("SMS result:", smsResult);
      } catch (smsError: any) {
        console.error("SMS error:", smsError);
        smsResult = {
          sent: false,
          error: smsError.message,
        };
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id: insertedOrder.id,
        call_id: callId,
        total: total.toFixed(2),
        sms: smsResult,
        message: "Test order created successfully",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "An unexpected error occurred" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
