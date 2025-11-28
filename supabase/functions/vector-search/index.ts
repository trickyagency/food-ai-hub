import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, limit = 5 } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Lovable API key for embeddings
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Generate embedding for the query using Lovable AI
    const embeddingResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/embeddings",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: query,
          model: "text-embedding-3-small",
        }),
      }
    );

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error("Embedding API error:", errorText);
      throw new Error("Failed to generate embedding");
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // Search for similar vectors using cosine distance
    // Note: This is a simple approach. For production, consider using pgvector's vector similarity functions
    const { data: results, error } = await supabase
      .rpc("match_vectors", {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: limit,
      })
      .select("*");

    if (error) {
      // If the RPC function doesn't exist, fall back to basic search
      console.warn("match_vectors RPC not found, falling back to basic search");
      const { data: fallbackResults, error: fallbackError } = await supabase
        .from("vectors_data")
        .select("*")
        .limit(limit);

      if (fallbackError) throw fallbackError;

      return new Response(
        JSON.stringify({
          results: fallbackResults || [],
          warning: "Vector similarity search not available, returning recent records",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        results: results || [],
        query,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in vector-search:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
