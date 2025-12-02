import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapiApiKey = Deno.env.get('VAPI_API_KEY');

    if (!vapiApiKey) {
      console.error('VAPI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'VAPI_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { fileId } = await req.json();

    if (!fileId) {
      return new Response(
        JSON.stringify({ error: 'fileId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing delete request for file: ${fileId}`);

    // Look up the Vapi file record
    const { data: vapiFile, error: vapiFileError } = await supabase
      .from('vapi_files')
      .select('*')
      .eq('local_file_id', fileId)
      .maybeSingle();

    if (vapiFileError) {
      console.error('Error querying vapi_files:', vapiFileError);
      return new Response(
        JSON.stringify({ error: 'Failed to query vapi_files' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!vapiFile) {
      console.log('File not synced to Vapi, nothing to delete');
      return new Response(
        JSON.stringify({ success: true, message: 'File not synced to Vapi' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If file is synced to Vapi, delete it from Vapi
    if (vapiFile.vapi_file_id) {
      console.log(`Deleting file from Vapi: ${vapiFile.vapi_file_id}`);

      const vapiDeleteResponse = await fetch(
        `https://api.vapi.ai/file/${vapiFile.vapi_file_id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${vapiApiKey}`,
          },
        }
      );

      if (!vapiDeleteResponse.ok) {
        const errorText = await vapiDeleteResponse.text();
        console.error('Failed to delete file from Vapi:', errorText);
        // Continue with local deletion even if Vapi deletion fails
        console.log('Continuing with local deletion despite Vapi error');
      } else {
        console.log('File deleted from Vapi successfully');
      }
    }

    // Update knowledge bases that reference this file
    console.log('Checking for knowledge base references...');
    const { data: kbsWithFile, error: kbQueryError } = await supabase
      .from('vapi_knowledge_bases')
      .select('*')
      .contains('file_ids', [vapiFile.id]);

    if (!kbQueryError && kbsWithFile && kbsWithFile.length > 0) {
      console.log(`Found ${kbsWithFile.length} knowledge bases referencing this file`);
      
      for (const kb of kbsWithFile) {
        const updatedFileIds = (kb.file_ids || []).filter((id: string) => id !== vapiFile.id);
        
        const { error: kbUpdateError } = await supabase
          .from('vapi_knowledge_bases')
          .update({ file_ids: updatedFileIds, updated_at: new Date().toISOString() })
          .eq('id', kb.id);

        if (kbUpdateError) {
          console.error(`Failed to update knowledge base ${kb.id}:`, kbUpdateError);
        } else {
          console.log(`Updated knowledge base ${kb.id}, removed file reference`);
        }
      }
    }

    // Delete the vapi_files record
    const { error: deleteError } = await supabase
      .from('vapi_files')
      .delete()
      .eq('id', vapiFile.id);

    if (deleteError) {
      console.error('Error deleting vapi_files record:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete vapi_files record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Vapi file record deleted successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'File deleted from Vapi and database',
        deletedFromVapi: !!vapiFile.vapi_file_id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in vapi-file-delete:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
