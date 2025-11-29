import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const VAPI_API_KEY = Deno.env.get("VAPI_API_KEY");
const VAPI_BASE_URL = "https://api.vapi.ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!VAPI_API_KEY) {
      console.error("VAPI_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Vapi API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint") || "/call";
    const method = req.method;

    console.log(`Proxying ${method} request to Vapi: ${endpoint}`);

    // Prepare request to Vapi API
    const vapiUrl = `${VAPI_BASE_URL}${endpoint}`;
    const vapiHeaders: HeadersInit = {
      "Authorization": `Bearer ${VAPI_API_KEY}`,
      "Content-Type": "application/json",
    };

    let vapiRequestInit: RequestInit = {
      method,
      headers: vapiHeaders,
    };

    // Add body for POST/PUT/PATCH requests
    if (method === "POST" || method === "PUT" || method === "PATCH") {
      const body = await req.text();
      if (body) {
        vapiRequestInit.body = body;
      }
    }

    console.log(`Making request to: ${vapiUrl}`);
    const vapiResponse = await fetch(vapiUrl, vapiRequestInit);

    console.log(`Vapi response status: ${vapiResponse.status}`);

    if (!vapiResponse.ok) {
      const errorText = await vapiResponse.text();
      console.error(`Vapi API error: ${vapiResponse.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ 
          error: "Vapi API error", 
          status: vapiResponse.status,
          details: errorText 
        }),
        { 
          status: vapiResponse.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const data = await vapiResponse.json();
    console.log(`Successfully fetched data from Vapi`);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in vapi-proxy function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
