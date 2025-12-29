import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const vapiApiKey = Deno.env.get("VAPI_API_KEY");

    if (!supabaseUrl || !supabaseKey || !vapiApiKey) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Invalid user token");
    }

    const { assistantId } = await req.json();

    if (!assistantId) {
      throw new Error("assistantId is required");
    }

    console.log("Creating capture_order tool for assistant:", assistantId);

    // Define the capture_order function tool
    const captureOrderTool = {
      type: "function",
      function: {
        name: "capture_order",
        description: "Capture and confirm a customer's food order. Call this function when the customer has finished ordering and confirms their order. This will save the order and send an SMS confirmation to the customer.",
        parameters: {
          type: "object",
          properties: {
            customer_name: {
              type: "string",
              description: "The customer's name"
            },
            customer_number: {
              type: "string",
              description: "The customer's phone number (the number they are calling from)"
            },
            items: {
              type: "array",
              description: "Array of order items",
              items: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    description: "Name of the menu item"
                  },
                  quantity: {
                    type: "number",
                    description: "Quantity ordered"
                  },
                  price: {
                    type: "number",
                    description: "Price per item"
                  },
                  notes: {
                    type: "string",
                    description: "Special notes for this item (optional)"
                  }
                },
                required: ["name", "quantity", "price"]
              }
            },
            total: {
              type: "number",
              description: "Total order amount before tax"
            },
            special_instructions: {
              type: "string",
              description: "Any special instructions for the entire order (optional)"
            },
            order_type: {
              type: "string",
              enum: ["pickup", "delivery"],
              description: "Whether this is a pickup or delivery order"
            },
            delivery_address: {
              type: "string",
              description: "Delivery address (required for delivery orders)"
            },
            estimated_time: {
              type: "number",
              description: "Estimated preparation time in minutes (default 30)"
            }
          },
          required: ["customer_name", "customer_number", "items", "total", "order_type"]
        }
      },
      server: {
        url: `${supabaseUrl}/functions/v1/vapi-webhook`
      }
    };

    // Create the tool in Vapi
    console.log("Creating tool in Vapi...");
    const createToolResponse = await fetch("https://api.vapi.ai/tool", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${vapiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(captureOrderTool),
    });

    if (!createToolResponse.ok) {
      const errorText = await createToolResponse.text();
      throw new Error(`Failed to create tool: ${createToolResponse.status} - ${errorText}`);
    }

    const newTool = await createToolResponse.json();
    console.log("Tool created with ID:", newTool.id);

    // Get current assistant to check existing tools
    const assistantResponse = await fetch(
      `https://api.vapi.ai/assistant/${assistantId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${vapiApiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!assistantResponse.ok) {
      throw new Error(`Failed to fetch assistant: ${assistantResponse.status}`);
    }

    const assistant = await assistantResponse.json();
    const existingToolIds = assistant.model?.toolIds || [];

    // Check if there's already a capture_order tool and remove it
    const toolsToKeep = [];
    for (const toolId of existingToolIds) {
      try {
        const toolResponse = await fetch(`https://api.vapi.ai/tool/${toolId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${vapiApiKey}`,
            "Content-Type": "application/json",
          },
        });

        if (toolResponse.ok) {
          const toolData = await toolResponse.json();
          // Keep the tool if it's NOT a capture_order function
          if (toolData.type !== "function" || toolData.function?.name !== "capture_order") {
            toolsToKeep.push(toolId);
          } else {
            console.log("Found existing capture_order tool, will replace:", toolId);
            // Delete the old capture_order tool
            await fetch(`https://api.vapi.ai/tool/${toolId}`, {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${vapiApiKey}`,
              },
            });
          }
        }
      } catch (err) {
        console.log("Error checking tool, keeping it:", toolId);
        toolsToKeep.push(toolId);
      }
    }

    // Add the new tool to the assistant
    const updatedToolIds = [...toolsToKeep, newTool.id];
    console.log("Updating assistant with toolIds:", updatedToolIds);

    const updateResponse = await fetch(
      `https://api.vapi.ai/assistant/${assistantId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${vapiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: {
            ...assistant.model,
            toolIds: updatedToolIds,
          },
        }),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to update assistant: ${updateResponse.status} - ${errorText}`);
    }

    const updatedAssistant = await updateResponse.json();
    console.log("Assistant updated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "capture_order tool created and attached to assistant",
        toolId: newTool.id,
        assistantToolIds: updatedAssistant.model?.toolIds || [],
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in vapi-create-order-tool:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "An unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
