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

    const { knowledgeBaseName, assistantId, fileIds } = await req.json();

    if (!knowledgeBaseName || !assistantId || !fileIds || fileIds.length === 0) {
      throw new Error('knowledgeBaseName, assistantId, and fileIds are required');
    }

    const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
    if (!VAPI_API_KEY) {
      throw new Error('VAPI_API_KEY not configured');
    }

    console.log('Creating/updating knowledge base:', knowledgeBaseName);

    // Get vapi file IDs from local file IDs
    const { data: vapiFiles, error: vapiFilesError } = await supabaseClient
      .from('vapi_files')
      .select('vapi_file_id')
      .in('local_file_id', fileIds)
      .eq('status', 'done');

    if (vapiFilesError || !vapiFiles || vapiFiles.length === 0) {
      throw new Error('No uploaded Vapi files found. Please upload files to Vapi first.');
    }

    const vapiFileIds = vapiFiles.map(f => f.vapi_file_id);
    console.log('Using Vapi file IDs:', vapiFileIds);

    // Check if knowledge base already exists
    const { data: existingKb } = await supabaseClient
      .from('vapi_knowledge_bases')
      .select('*')
      .eq('assistant_id', assistantId)
      .eq('user_id', user.id)
      .single();

    let kbId = existingKb?.vapi_kb_id;

    if (existingKb && kbId) {
      // Update existing knowledge base in Vapi
      console.log('Updating existing knowledge base:', kbId);
      
      const updateResponse = await fetch(`https://api.vapi.ai/knowledge-base/${kbId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileIds: vapiFileIds,
        }),
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(`Failed to update knowledge base: ${updateResponse.status} - ${errorText}`);
      }

      console.log('Knowledge base updated successfully');

      // Update in database
      await supabaseClient
        .from('vapi_knowledge_bases')
        .update({
          file_ids: vapiFileIds,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingKb.id);
    } else {
      // Create new knowledge base in Vapi
      console.log('Creating new knowledge base');

      const createResponse = await fetch('https://api.vapi.ai/knowledge-base', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'canonical',
          fileIds: vapiFileIds,
        }),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Failed to create knowledge base: ${createResponse.status} - ${errorText}`);
      }

      const kbData = await createResponse.json();
      kbId = kbData.id;
      console.log('Knowledge base created:', kbId);

      // Store in database
      await supabaseClient
        .from('vapi_knowledge_bases')
        .insert({
          vapi_kb_id: kbId,
          name: knowledgeBaseName,
          file_ids: vapiFileIds,
          assistant_id: assistantId,
          user_id: user.id,
        });
    }

    console.log('Knowledge base is ready and can be used by assistant');

    return new Response(
      JSON.stringify({
        success: true,
        knowledgeBaseId: kbId,
        message: 'Knowledge base synced and attached to assistant',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Knowledge base sync error:', error);
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
