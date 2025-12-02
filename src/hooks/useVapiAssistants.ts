import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface VapiAssistant {
  id: string;
  name: string;
  model?: any;
  voice?: any;
  firstMessage?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const useVapiAssistants = (autoFetch = true) => {
  const [assistants, setAssistants] = useState<VapiAssistant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssistants = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Fetching assistants from Supabase cache...");

      // First, try to get from Supabase cache
      const { data: cachedAssistants, error: cacheError } = await supabase
        .from("vapi_assistants_cache")
        .select("*")
        .order("created_at", { ascending: false });

      if (!cacheError && cachedAssistants && cachedAssistants.length > 0) {
        console.log(`Retrieved ${cachedAssistants.length} assistants from cache`);
        setAssistants(cachedAssistants);
        setLoading(false);

        // Trigger background sync
        console.log("Triggering background sync...");
        supabase.functions.invoke("vapi-sync").catch(err => {
          console.error("Background sync failed:", err);
        });

        return;
      }

      console.log("No cached data, fetching from Vapi API...");

      const { data, error: functionError } = await supabase.functions.invoke("vapi-proxy", {
        body: { endpoint: "/assistant", method: "GET" },
      });

      if (functionError) {
        console.error("Function error:", functionError);
        throw new Error(functionError.message);
      }

      if (data?.error) {
        console.error("Vapi API error:", data);
        throw new Error(data.error);
      }

      console.log("Vapi assistants response:", data);

      const assistantsData = Array.isArray(data) ? data : [];
      console.log(`Fetched ${assistantsData.length} assistants from Vapi`);
      
      setAssistants(assistantsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch assistants";
      setError(errorMessage);
      console.error("Error fetching Vapi assistants:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch) {
      fetchAssistants();
    }
  }, [autoFetch]);

  return {
    assistants,
    loading,
    error,
    refresh: fetchAssistants,
  };
};
