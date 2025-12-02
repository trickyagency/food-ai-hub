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

    console.log("Syncing KB:", { knowledgeBaseName, assistantId, fileIds });

    if (!knowledgeBaseName || !fileIds || fileIds.length === 0) {
      throw new Error("Knowledge base name and file IDs are required");
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

    console.log("Vapi file IDs:", vapiFileIds);

    // Check if global KB exists in our database
    const { data: existingKB, error: kbCheckError } = await supabase
      .from("vapi_knowledge_bases")
      .select("*")
      .eq("user_id", user.id)
      .eq("name", "Global Knowledge Base")
      .maybeSingle();

    if (kbCheckError) throw kbCheckError;

    let vapiKbId: string;
    let isUpdate = false;

    if (existingKB && existingKB.vapi_kb_id) {
      // Update existing KB in Vapi
      console.log("Updating existing KB:", existingKB.vapi_kb_id);
      vapiKbId = existingKB.vapi_kb_id;
      isUpdate = true;

      const updateResponse = await fetch(
        `https://api.vapi.ai/knowledge-base/${vapiKbId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${vapiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            provider: 'canonical',
            fileIds: vapiFileIds,
          }),
        }
      );

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(
          `Failed to update knowledge base: ${updateResponse.status} - ${errorText}`
        );
      }
    } else {
      // Create new KB in Vapi
      console.log("Creating new KB");
      const createResponse = await fetch("https://api.vapi.ai/knowledge-base", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${vapiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: "canonical",
          name: "Global Knowledge Base",
          fileIds: vapiFileIds,
        }),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(
          `Failed to create knowledge base: ${createResponse.status} - ${errorText}`
        );
      }

      const kbData = await createResponse.json();
      vapiKbId = kbData.id;
      console.log("Created KB with ID:", vapiKbId);
    }

    // Update our database
    if (existingKB) {
      const { error: updateError } = await supabase
        .from("vapi_knowledge_bases")
        .update({
          vapi_kb_id: vapiKbId,
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
          vapi_kb_id: vapiKbId,
          file_ids: fileIds,
          assistant_id: assistantId,
          status: "active",
          user_id: user.id,
        });

      if (insertError) throw insertError;
    }

    // If assistant is provided, update the assistant in Vapi to use this KB
    if (assistantId) {
      console.log("Attaching KB to assistant:", assistantId);
      
      const assistantUpdateResponse = await fetch(
        `https://api.vapi.ai/assistant/${assistantId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${vapiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            knowledgeBase: {
              provider: "canonical",
              id: vapiKbId,
            },
          }),
        }
      );

      if (!assistantUpdateResponse.ok) {
        const errorText = await assistantUpdateResponse.text();
        console.error("Failed to attach KB to assistant:", errorText);
        // Don't throw here, as the KB was created successfully
      } else {
        console.log("Successfully attached KB to assistant");
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        knowledgeBaseId: vapiKbId,
        message: isUpdate
          ? "Knowledge base updated successfully"
          : "Knowledge base created successfully",
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
