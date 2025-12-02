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

    const { knowledgeBaseId, vapiFileId } = await req.json();

    if (!knowledgeBaseId || !vapiFileId) {
      throw new Error('knowledgeBaseId and vapiFileId are required');
    }

    const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
    if (!VAPI_API_KEY) {
      throw new Error('VAPI_API_KEY not configured');
    }

    console.log('Unsyncing file from knowledge base:', { knowledgeBaseId, vapiFileId });

    // Get current knowledge base
    const { data: kb, error: kbError } = await supabaseClient
      .from('vapi_knowledge_bases')
      .select('*')
      .eq('id', knowledgeBaseId)
      .eq('user_id', user.id)
      .single();

    if (kbError || !kb) {
      throw new Error('Knowledge base not found');
    }

    // Remove the file from file_ids array
    const currentFileIds = kb.file_ids || [];
    const updatedFileIds = currentFileIds.filter((id: string) => id !== vapiFileId);

    console.log('Recreating Vapi knowledge base with remaining files:', updatedFileIds);

    // Delete old knowledge base from Vapi
    const deleteResponse = await fetch(`https://api.vapi.ai/knowledge-base/${kb.vapi_kb_id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
      },
    });

    if (!deleteResponse.ok) {
      console.warn('Failed to delete old knowledge base, continuing:', deleteResponse.status);
    }

    let newKbId = null;

    // Only create new knowledge base if there are files remaining
    if (updatedFileIds.length > 0) {
      const createResponse = await fetch('https://api.vapi.ai/knowledge-base', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'canonical',
          fileIds: updatedFileIds,
        }),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Failed to create new knowledge base in Vapi: ${createResponse.status} - ${errorText}`);
      }

      const kbData = await createResponse.json();
      newKbId = kbData.id;
      console.log('New knowledge base created:', newKbId);
    } else {
      console.log('No files remaining, knowledge base will be marked as empty');
    }

    // Update in database
    if (updatedFileIds.length > 0) {
      const { error: updateError } = await supabaseClient
        .from('vapi_knowledge_bases')
        .update({
          vapi_kb_id: newKbId,
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
