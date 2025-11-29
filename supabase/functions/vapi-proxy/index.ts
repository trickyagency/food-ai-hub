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

    // Parse the request body to extract our routing parameter
    const requestBody = await req.json();
    const endpoint = requestBody.endpoint || "/call";
    const method = requestBody.method || "GET";
    
    // Remove the endpoint and method fields from the body before forwarding to Vapi
    const { endpoint: _, method: __, ...vapiBody } = requestBody;

    console.log(`Proxying ${method} request to Vapi: ${endpoint}`);

    // Prepare request to Vapi API
    const vapiUrl = `${VAPI_BASE_URL}${endpoint}`;
    const vapiHeaders: HeadersInit = {
      "Authorization": `Bearer ${VAPI_API_KEY}`,
      "Content-Type": "application/json",
    };

    let vapiRequestInit: RequestInit = {
      method: method,
      headers: vapiHeaders,
    };

    // Add body for POST, PUT, PATCH requests
    if (["POST", "PUT", "PATCH"].includes(method) && Object.keys(vapiBody).length > 0) {
      vapiRequestInit.body = JSON.stringify(vapiBody);
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
