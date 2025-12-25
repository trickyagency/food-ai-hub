import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Accept both fileId (from frontend) and vapiFileId (legacy)
    const { knowledgeBaseId, fileId, vapiFileId } = await req.json();
    const targetFileId = fileId || vapiFileId;

    if (!knowledgeBaseId || !targetFileId) {
      throw new Error('knowledgeBaseId and fileId are required');
    }

    const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
    if (!VAPI_API_KEY) {
      throw new Error('VAPI_API_KEY not configured');
    }

    console.log('Unsyncing file from knowledge base:', { knowledgeBaseId, targetFileId });

    // Get current knowledge base record
    const { data: kb, error: kbError } = await supabaseClient
      .from('vapi_knowledge_bases')
      .select('*')
      .eq('id', knowledgeBaseId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (kbError) throw kbError;
    if (!kb) {
      throw new Error('Knowledge base not found');
    }

    // Remove the file from file_ids array
    const currentFileIds = kb.file_ids || [];
    const updatedFileIds = currentFileIds.filter((id: string) => id !== targetFileId);

    console.log('Remaining file IDs after removal:', updatedFileIds);

    // Get Vapi file IDs for remaining files
    let vapiFileIds: string[] = [];
    if (updatedFileIds.length > 0) {
      const { data: vapiFilesData, error: filesError } = await supabaseClient
        .from('vapi_files')
        .select('vapi_file_id')
        .in('id', updatedFileIds)
        .eq('user_id', user.id);

      if (filesError) throw filesError;

      vapiFileIds = vapiFilesData
        .map((f) => f.vapi_file_id)
        .filter((id): id is string => id !== null);
    }

    // Delete the old query tool if it exists
    if (kb.vapi_kb_id) {
      console.log('Deleting old query tool:', kb.vapi_kb_id);
      const deleteResponse = await fetch(`https://api.vapi.ai/tool/${kb.vapi_kb_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
        },
      });

      if (!deleteResponse.ok) {
        console.warn('Failed to delete old query tool, continuing:', deleteResponse.status);
      }
    }

    let newToolId = null;

    // Only create new query tool if there are files remaining
    if (vapiFileIds.length > 0) {
      console.log('Creating new query tool with remaining files:', vapiFileIds);
      
      const createToolResponse = await fetch('https://api.vapi.ai/tool', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'query',
          function: {
            name: 'searchKnowledgeBase'
          },
          knowledgeBases: [
            {
              provider: 'google',
              name: 'restaurant-kb',
              description: 'Contains restaurant menu, specials, hours, policies, and other business information',
              fileIds: vapiFileIds
            }
          ]
        }),
      });

      if (!createToolResponse.ok) {
        const errorText = await createToolResponse.text();
        throw new Error(`Failed to create new query tool: ${createToolResponse.status} - ${errorText}`);
      }

      const toolData = await createToolResponse.json();
      newToolId = toolData.id;
      console.log('New query tool created:', newToolId);

      // Update assistant with new tool ID
      if (kb.assistant_id) {
        // Get current assistant
        const getAssistantResponse = await fetch(
          `https://api.vapi.ai/assistant/${kb.assistant_id}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${VAPI_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (getAssistantResponse.ok) {
          const assistantData = await getAssistantResponse.json();
          
          // Replace old tool ID with new one
          const existingToolIds = assistantData.model?.toolIds || [];
          const filteredToolIds = existingToolIds.filter((id: string) => id !== kb.vapi_kb_id);
          const updatedToolIds = [...filteredToolIds, newToolId];

          const modelUpdate = {
            ...assistantData.model,
            toolIds: updatedToolIds
          };

          await fetch(`https://api.vapi.ai/assistant/${kb.assistant_id}`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${VAPI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ model: modelUpdate }),
          });

          console.log('Updated assistant with new tool ID');
        }
      }
    } else {
      console.log('No files remaining, removing tool from assistant');
      
      // Remove old tool from assistant
      if (kb.assistant_id && kb.vapi_kb_id) {
        const getAssistantResponse = await fetch(
          `https://api.vapi.ai/assistant/${kb.assistant_id}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${VAPI_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (getAssistantResponse.ok) {
          const assistantData = await getAssistantResponse.json();
          const existingToolIds = assistantData.model?.toolIds || [];
          const updatedToolIds = existingToolIds.filter((id: string) => id !== kb.vapi_kb_id);

          const modelUpdate = {
            ...assistantData.model,
            toolIds: updatedToolIds
          };

          await fetch(`https://api.vapi.ai/assistant/${kb.assistant_id}`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${VAPI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ model: modelUpdate }),
          });

          console.log('Removed tool from assistant');
        }
      }
    }

    // Update database
    if (updatedFileIds.length > 0) {
      const { error: updateError } = await supabaseClient
        .from('vapi_knowledge_bases')
        .update({
          vapi_kb_id: newToolId,
          file_ids: updatedFileIds,
          updated_at: new Date().toISOString(),
        })
        .eq('id', knowledgeBaseId);

      if (updateError) {
        throw new Error(`Failed to update knowledge base in database: ${updateError.message}`);
      }
    } else {
      // Delete knowledge base from database if no files remain
      const { error: deleteError } = await supabaseClient
        .from('vapi_knowledge_bases')
        .delete()
        .eq('id', knowledgeBaseId);

      if (deleteError) {
        throw new Error(`Failed to delete empty knowledge base from database: ${deleteError.message}`);
      }
    }

    console.log('File unsynced from knowledge base successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: updatedFileIds.length > 0 
          ? 'File removed from knowledge base' 
          : 'Knowledge base deleted (no files remaining)',
        remainingFiles: updatedFileIds.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Unsync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
