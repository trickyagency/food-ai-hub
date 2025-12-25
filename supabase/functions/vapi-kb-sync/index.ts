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

    // Step 0: Get the current assistant's tool IDs and remove any existing KB query tools
    console.log("Fetching current assistant configuration to clean up old tools...");
    
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

    const currentAssistantData = await getAssistantResponse.json();
    const currentToolIds = currentAssistantData.model?.toolIds || [];
    console.log("Current tool IDs on assistant:", currentToolIds);

    // Identify and delete old query tools (KB tools)
    const oldQueryToolIds: string[] = [];
    for (const toolId of currentToolIds) {
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
          // Check if this is a query tool (knowledge base tool)
          if (toolData.type === "query" && toolData.function?.name === "searchKnowledgeBase") {
            oldQueryToolIds.push(toolId);
            console.log(`Found old KB query tool to remove: ${toolId}`);
          }
        }
      } catch (error) {
        console.error(`Error checking tool ${toolId}:`, error);
      }
    }

    // Delete old query tools from Vapi
    for (const oldToolId of oldQueryToolIds) {
      try {
        console.log(`Deleting old query tool: ${oldToolId}`);
        const deleteResponse = await fetch(
          `https://api.vapi.ai/tool/${oldToolId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${vapiApiKey}`,
              "Content-Type": "application/json",
            },
          }
        );
        
        if (deleteResponse.ok) {
          console.log(`Successfully deleted old tool: ${oldToolId}`);
        } else {
          console.log(`Failed to delete old tool ${oldToolId}: ${deleteResponse.status}`);
        }
      } catch (error) {
        console.error(`Error deleting old tool ${oldToolId}:`, error);
      }
    }

    // Filter out the old query tools from the current tool IDs
    const remainingToolIds = currentToolIds.filter((id: string) => !oldQueryToolIds.includes(id));
    console.log("Remaining tool IDs after cleanup:", remainingToolIds);

    // Step 1: Create a new Query Tool via the /tool endpoint
    console.log("Creating new query tool with knowledge base files...");
    
    const createToolResponse = await fetch(
      "https://api.vapi.ai/tool",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${vapiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "query",
          function: {
            name: "searchKnowledgeBase"
          },
          knowledgeBases: [
            {
              provider: "google",
              name: "restaurant-kb",
              description: "Contains restaurant menu, specials, hours, policies, and other business information to answer customer questions",
              fileIds: vapiFileIds
            }
          ]
        }),
      }
    );

    if (!createToolResponse.ok) {
      const errorText = await createToolResponse.text();
      console.error("Failed to create tool:", createToolResponse.status, errorText);
      throw new Error(`Failed to create query tool: ${createToolResponse.status} - ${errorText}`);
    }

    const toolData = await createToolResponse.json();
    const toolId = toolData.id;
    console.log("Created query tool with ID:", toolId);

    // Step 2: Update the assistant's model with the new tool ID
    // Use the remainingToolIds from cleanup + new tool ID
    const updatedToolIds = [...remainingToolIds, toolId];

    // Step 3: Update the assistant's model with the new tool ID
    // IMPORTANT: We need to include the entire model object when patching
    const modelUpdate = {
      ...currentAssistantData.model,
      toolIds: updatedToolIds
    };

    console.log("Updating assistant with tool IDs:", updatedToolIds);

    const updateAssistantResponse = await fetch(
      `https://api.vapi.ai/assistant/${assistantId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${vapiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelUpdate,
        }),
      }
    );

    if (!updateAssistantResponse.ok) {
      const errorText = await updateAssistantResponse.text();
      throw new Error(`Failed to update assistant: ${updateAssistantResponse.status} - ${errorText}`);
    }

    console.log("Successfully attached query tool to assistant");

    // Update our database to track the files and tool ID
    if (existingKB) {
      const { error: updateError } = await supabase
        .from("vapi_knowledge_bases")
        .update({
          file_ids: fileIds,
          assistant_id: assistantId,
          vapi_kb_id: toolId, // Store the tool ID for reference
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
          vapi_kb_id: toolId, // Store the tool ID for reference
          status: "active",
          user_id: user.id,
        });

      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Knowledge base query tool created and attached to assistant",
        toolId: toolId,
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
