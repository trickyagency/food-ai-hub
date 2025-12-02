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

    const { fileId } = await req.json();

    if (!fileId) {
      throw new Error('fileId is required');
    }

    const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
    if (!VAPI_API_KEY) {
      throw new Error('VAPI_API_KEY not configured');
    }

    console.log('Uploading file to Vapi:', fileId);

    // Get file from database
    const { data: fileRecord, error: fileError } = await supabaseClient
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fileError || !fileRecord) {
      throw new Error('File not found in database');
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabaseClient
      .storage
      .from('database-files')
      .download(fileRecord.storage_path);

    if (downloadError || !fileData) {
      throw new Error('Failed to download file from storage');
    }

    // Create FormData for Vapi upload
    const formData = new FormData();
    formData.append('file', fileData, fileRecord.file_name);

    console.log('Sending file to Vapi API...');

    // Upload to Vapi
    const vapiResponse = await fetch('https://api.vapi.ai/file', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
      },
      body: formData,
    });

    if (!vapiResponse.ok) {
      const errorText = await vapiResponse.text();
      throw new Error(`Vapi upload failed: ${vapiResponse.status} - ${errorText}`);
    }

    const vapiFile = await vapiResponse.json();
    console.log('File uploaded to Vapi:', vapiFile.id);

    // Store Vapi file record
    const { error: insertError } = await supabaseClient
      .from('vapi_files')
      .upsert({
        vapi_file_id: vapiFile.id,
        local_file_id: fileId,
        file_name: fileRecord.file_name,
        status: 'done',
        vapi_url: vapiFile.url,
        user_id: user.id,
      }, { onConflict: 'vapi_file_id' });

    if (insertError) {
      console.error('Error storing vapi file record:', insertError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        vapiFileId: vapiFile.id,
        vapiUrl: vapiFile.url,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('File upload error:', error);
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
