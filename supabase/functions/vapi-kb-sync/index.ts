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

    const { knowledgeBaseName, assistantId, fileIds } = await req.json();

    console.log("Syncing files to assistant:", { knowledgeBaseName, assistantId, fileIds });

    if (!fileIds || fileIds.length === 0) {
      throw new Error("File IDs are required");
    }

    if (!assistantId) {
      throw new Error("Assistant ID is required");
    }

    // Get Vapi file IDs from our database
    const { data: vapiFilesData, error: filesError } = await supabase
      .from("vapi_files")
      .select("vapi_file_id")
      .in("id", fileIds)
      .eq("user_id", user.id);

    if (filesError) throw filesError;

    const vapiFileIds = vapiFilesData
      .map((f) => f.vapi_file_id)
      .filter((id) => id !== null);

    if (vapiFileIds.length === 0) {
      throw new Error("No valid Vapi file IDs found");
    }

    console.log("Vapi file IDs to attach:", vapiFileIds);

    // Check if KB record exists in our database for tracking
    const { data: existingKB, error: kbCheckError } = await supabase
      .from("vapi_knowledge_bases")
      .select("*")
      .eq("user_id", user.id)
      .eq("name", "Global Knowledge Base")
      .maybeSingle();

    if (kbCheckError) throw kbCheckError;

    // Update the assistant to include a query tool with these files
    // This is the new approach since canonical KB was deprecated on Dec 5, 2024
    console.log("Updating assistant with query tool for files:", assistantId);
    
    // First, get the current assistant configuration
    const getAssistantResponse = await fetch(
      `https://api.vapi.ai/assistant/${assistantId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${vapiApiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!getAssistantResponse.ok) {
      const errorText = await getAssistantResponse.text();
      throw new Error(`Failed to get assistant: ${getAssistantResponse.status} - ${errorText}`);
    }

    const assistantData = await getAssistantResponse.json();
    console.log("Current assistant has tools:", assistantData.tools?.length || 0);

    // Create a query tool configuration with the file IDs
    const queryTool = {
      type: "query",
      function: {
        name: "searchKnowledgeBase",
        description: "Search the knowledge base for relevant information to answer user questions about the restaurant menu, specials, hours, and policies.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query to find relevant information"
            }
          },
          required: ["query"]
        }
      },
      fileIds: vapiFileIds
    };

    // Filter out any existing query tools with the same name, keep other tools
    const existingTools = assistantData.tools || [];
    const otherTools = existingTools.filter((tool: any) => 
      !(tool.type === "query" && tool.function?.name === "searchKnowledgeBase")
    );

    // Add the new query tool
    const updatedTools = [...otherTools, queryTool];

    // Update assistant with the query tool
    const updateAssistantResponse = await fetch(
      `https://api.vapi.ai/assistant/${assistantId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${vapiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tools: updatedTools,
        }),
      }
    );

    if (!updateAssistantResponse.ok) {
      const errorText = await updateAssistantResponse.text();
      throw new Error(`Failed to update assistant: ${updateAssistantResponse.status} - ${errorText}`);
    }

    console.log("Successfully updated assistant with query tool");

    // Update our database to track the files
    if (existingKB) {
      const { error: updateError } = await supabase
        .from("vapi_knowledge_bases")
        .update({
          file_ids: fileIds,
          assistant_id: assistantId,
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingKB.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from("vapi_knowledge_bases")
        .insert({
          name: "Global Knowledge Base",
          file_ids: fileIds,
          assistant_id: assistantId,
          status: "active",
          user_id: user.id,
        });

      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Files attached to assistant successfully via query tool",
        fileCount: vapiFileIds.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in vapi-kb-sync:", error);
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
