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

    console.log("Fetching assistant info:", assistantId);

    // Fetch assistant data directly from Vapi
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
      const errorText = await assistantResponse.text();
      throw new Error(`Failed to fetch assistant: ${assistantResponse.status} - ${errorText}`);
    }

    const assistantData = await assistantResponse.json();
    console.log("Assistant data fetched:", assistantData.name);

    // Get the tool IDs from the assistant's model
    const toolIds = assistantData.model?.toolIds || [];
    console.log("Tool IDs on assistant:", toolIds);

    // Fetch details for each tool to identify query tools (knowledge base tools)
    const toolDetails = [];
    for (const toolId of toolIds) {
      try {
        const toolResponse = await fetch(
          `https://api.vapi.ai/tool/${toolId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${vapiApiKey}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (toolResponse.ok) {
          const toolData = await toolResponse.json();
          toolDetails.push({
            id: toolId,
            type: toolData.type,
            functionName: toolData.function?.name,
            knowledgeBases: toolData.knowledgeBases || [],
            createdAt: toolData.createdAt,
          });
          console.log(`Tool ${toolId}: type=${toolData.type}, function=${toolData.function?.name}`);
        } else {
          console.log(`Failed to fetch tool ${toolId}: ${toolResponse.status}`);
          toolDetails.push({
            id: toolId,
            type: "unknown",
            error: `Failed to fetch: ${toolResponse.status}`,
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error(`Error fetching tool ${toolId}:`, err);
        toolDetails.push({
          id: toolId,
          type: "error",
          error: errorMessage,
        });
      }
    }

    // Filter to just query tools (knowledge base tools)
    const queryTools = toolDetails.filter(t => t.type === "query");
    console.log("Query tools found:", queryTools.length);

    // Extract file IDs from all query tools
    const allKnowledgeBaseFiles = [];
    for (const tool of queryTools) {
      for (const kb of tool.knowledgeBases || []) {
        if (kb.fileIds) {
          for (const fileId of kb.fileIds) {
            allKnowledgeBaseFiles.push({
              toolId: tool.id,
              fileId: fileId,
              kbName: kb.name,
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        assistant: {
          id: assistantData.id,
          name: assistantData.name,
          model: assistantData.model?.model,
        },
        toolIds: toolIds,
        tools: toolDetails,
        queryTools: queryTools,
        knowledgeBaseFiles: allKnowledgeBaseFiles,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in vapi-assistant-info:", error);
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
