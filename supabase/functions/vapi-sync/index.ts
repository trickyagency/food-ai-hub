import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getJwtRole(jwt: string): string | null {
  try {
    const parts = jwt.split('.');
    if (parts.length < 2) return null;
    const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payloadB64 + '='.repeat((4 - (payloadB64.length % 4)) % 4);
    const payloadJson = atob(padded);
    const payload = JSON.parse(payloadJson);
    return typeof payload?.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

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

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '').trim();

    // When the frontend calls functions without a session, Supabase JS will send the anon JWT.
    // That must NOT be treated as authenticated.
    if (!token) {
      return json(401, { error: 'Missing Authorization token' });
    }

    const role = getJwtRole(token);
    if (role === 'anon') {
      return json(401, { error: 'Not authenticated' });
    }

    // Get user from JWT
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return json(401, { error: 'Unauthorized' });
    }

    const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
    if (!VAPI_API_KEY) {
      return json(500, { error: 'VAPI_API_KEY not configured' });
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
      return json(500, { error: `Vapi API error: ${callsResponse.status}` });
    }

    const calls = await callsResponse.json();
    console.log(`Fetched ${calls.length} calls from Vapi`);

    // Calculate duration from startedAt and endedAt timestamps
    const calculateDuration = (startedAt?: string, endedAt?: string): number | null => {
      if (!startedAt || !endedAt) return null;
      const start = new Date(startedAt).getTime();
      const end = new Date(endedAt).getTime();
      return Math.round((end - start) / 1000); // seconds
    };

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
        duration: call.duration ?? calculateDuration(call.startedAt, call.endedAt),
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

    return json(200, {
      success: true,
      synced: {
        calls: calls.length,
        assistants: assistantsCount,
      },
    });
  } catch (error) {
    console.error('Sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return json(500, { error: errorMessage });
  }
});
