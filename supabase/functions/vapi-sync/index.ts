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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Get user from JWT
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

    const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
    if (!VAPI_API_KEY) {
      throw new Error('VAPI_API_KEY not configured');
    }

    console.log('Starting Vapi data sync for user:', user.id);

    // Sync calls
    console.log('Fetching calls from Vapi...');
    const callsResponse = await fetch('https://api.vapi.ai/call?limit=100', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!callsResponse.ok) {
      throw new Error(`Vapi API error: ${callsResponse.status}`);
    }

    const calls = await callsResponse.json();
    console.log(`Fetched ${calls.length} calls from Vapi`);

    // Upsert calls to database
    if (calls.length > 0) {
      const callsToInsert = calls.map((call: any) => ({
        id: call.id,
        type: call.type,
        status: call.status,
        customer_number: call.customer?.number,
        customer_name: call.customer?.name,
        phone_number_id: call.phoneNumberId,
        phone_number: call.phoneNumber?.number,
        assistant_id: call.assistantId,
        duration: call.duration,
        cost: call.cost,
        cost_breakdown: call.costs,
        ended_reason: call.endedReason,
        transcript: call.transcript,
        recording_url: call.recordingUrl,
        summary: call.summary,
        messages: call.messages,
        analysis: call.analysis,
        started_at: call.startedAt,
        ended_at: call.endedAt,
        created_at: call.createdAt,
        updated_at: call.updatedAt,
        user_id: user.id,
        synced_at: new Date().toISOString(),
      }));

      const { error: callsError } = await supabaseClient
        .from('vapi_calls')
        .upsert(callsToInsert, { onConflict: 'id' });

      if (callsError) {
        console.error('Error upserting calls:', callsError);
      } else {
        console.log(`Synced ${callsToInsert.length} calls to database`);
      }
    }

    // Sync assistants
    console.log('Fetching assistants from Vapi...');
    const assistantsResponse = await fetch('https://api.vapi.ai/assistant', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    let assistantsCount = 0;
    if (assistantsResponse.ok) {
      const assistants = await assistantsResponse.json();
      assistantsCount = assistants.length;
      console.log(`Fetched ${assistants.length} assistants from Vapi`);

      if (assistants.length > 0) {
        const assistantsToInsert = assistants.map((assistant: any) => ({
          id: assistant.id,
          name: assistant.name,
          model: assistant.model,
          voice: assistant.voice,
          first_message: assistant.firstMessage,
          created_at: assistant.createdAt,
          updated_at: assistant.updatedAt || new Date().toISOString(),
          user_id: user.id,
          full_data: assistant,
        }));

        const { error: assistantsError } = await supabaseClient
          .from('vapi_assistants_cache')
          .upsert(assistantsToInsert, { onConflict: 'id' });

        if (assistantsError) {
          console.error('Error upserting assistants:', assistantsError);
        } else {
          console.log(`Synced ${assistantsToInsert.length} assistants to cache`);
        }
      }
    }

    // Sync phone numbers
    console.log('Fetching phone numbers from Vapi...');
    const phoneNumbersResponse = await fetch('https://api.vapi.ai/phone-number', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    let phoneNumbersCount = 0;
    if (phoneNumbersResponse.ok) {
      const phoneNumbers = await phoneNumbersResponse.json();
      phoneNumbersCount = phoneNumbers.length;
      console.log(`Fetched ${phoneNumbers.length} phone numbers from Vapi`);

      if (phoneNumbers.length > 0) {
        const phoneNumbersToInsert = phoneNumbers.map((phoneNumber: any) => ({
          id: phoneNumber.id,
          number: phoneNumber.number,
          name: phoneNumber.name,
          assistant_id: phoneNumber.assistantId,
          created_at: phoneNumber.createdAt,
          updated_at: phoneNumber.updatedAt || new Date().toISOString(),
          user_id: user.id,
          full_data: phoneNumber,
        }));

        const { error: phoneNumbersError } = await supabaseClient
          .from('vapi_phone_numbers_cache')
          .upsert(phoneNumbersToInsert, { onConflict: 'id' });

        if (phoneNumbersError) {
          console.error('Error upserting phone numbers:', phoneNumbersError);
        } else {
          console.log(`Synced ${phoneNumbersToInsert.length} phone numbers to cache`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced: {
          calls: calls.length,
          assistants: assistantsCount,
          phoneNumbers: phoneNumbersCount,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Sync error:', error);
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
