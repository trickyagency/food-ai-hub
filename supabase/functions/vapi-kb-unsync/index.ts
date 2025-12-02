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

    console.log('Updating Vapi knowledge base with remaining files:', updatedFileIds);

    // Update knowledge base in Vapi
    const updateResponse = await fetch(`https://api.vapi.ai/knowledge-base/${kb.vapi_kb_id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileIds: updatedFileIds,
      }),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to update knowledge base in Vapi: ${updateResponse.status} - ${errorText}`);
    }

    console.log('Knowledge base updated in Vapi successfully');

    // Update in database
    const { error: updateError } = await supabaseClient
      .from('vapi_knowledge_bases')
      .update({
        file_ids: updatedFileIds,
        updated_at: new Date().toISOString(),
      })
      .eq('id', knowledgeBaseId);

    if (updateError) {
      throw new Error(`Failed to update knowledge base in database: ${updateError.message}`);
    }

    console.log('File unsynced from knowledge base successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'File removed from knowledge base',
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
