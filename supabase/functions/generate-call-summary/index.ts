import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { callId, transcript } = await req.json();
    
    if (!callId || !transcript) {
      return new Response(
        JSON.stringify({ error: "callId and transcript are required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating summary for call:', callId);

    // Get API keys
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Call Lovable AI to generate summary
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant that analyzes call transcripts and generates concise summaries. 
Extract the following information in a structured format:
1. A brief summary (2-3 sentences)
2. Key points discussed (3-5 bullet points)
3. Action items (if any)
4. Overall outcome/result of the call

Format your response as JSON with these exact fields:
{
  "summary": "Brief 2-3 sentence summary",
  "key_points": ["point 1", "point 2", ...],
  "action_items": ["item 1", "item 2", ...],
  "outcome": "Overall outcome/result"
}`
          },
          {
            role: 'user',
            content: `Analyze this call transcript and provide a structured summary:\n\n${transcript}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_call_summary",
              description: "Create a structured summary of a call transcript",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "string",
                    description: "A brief 2-3 sentence summary of the call"
                  },
                  key_points: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-5 key points discussed in the call"
                  },
                  action_items: {
                    type: "array",
                    items: { type: "string" },
                    description: "Action items or next steps identified"
                  },
                  outcome: {
                    type: "string",
                    description: "Overall outcome or result of the call"
                  }
                },
                required: ["summary", "key_points", "outcome"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_call_summary" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      throw new Error('Failed to generate summary');
    }

    const aiData = await aiResponse.json();
    console.log('AI response:', JSON.stringify(aiData));

    // Extract the tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || !toolCall.function?.arguments) {
      throw new Error('No valid tool call in AI response');
    }

    const summaryData = JSON.parse(toolCall.function.arguments);
    console.log('Parsed summary data:', summaryData);

    // Get user ID from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('User error:', userError);
      throw new Error('Failed to authenticate user');
    }

    // Store summary in database
    const { data: summaryRecord, error: dbError } = await supabase
      .from('call_summaries')
      .upsert({
        call_id: callId,
        summary: summaryData.summary,
        key_points: summaryData.key_points || [],
        action_items: summaryData.action_items || [],
        outcome: summaryData.outcome,
        user_id: user.id,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'call_id'
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to store summary');
    }

    console.log('Summary stored successfully:', summaryRecord);

    return new Response(
      JSON.stringify(summaryRecord),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error generating summary:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to generate summary' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});