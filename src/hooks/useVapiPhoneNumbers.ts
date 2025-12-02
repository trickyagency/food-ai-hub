import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface VapiPhoneNumber {
  id: string;
  number: string;
  name?: string;
  assistantId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const useVapiPhoneNumbers = (autoFetch = true) => {
  const [phoneNumbers, setPhoneNumbers] = useState<VapiPhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPhoneNumbers = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Fetching phone numbers from Supabase cache...");

      // First, try to get from Supabase cache
      const { data: cachedPhoneNumbers, error: cacheError } = await supabase
        .from("vapi_phone_numbers_cache")
        .select("*")
        .order("created_at", { ascending: false });

      if (!cacheError && cachedPhoneNumbers && cachedPhoneNumbers.length > 0) {
        console.log(`Retrieved ${cachedPhoneNumbers.length} phone numbers from cache`);
        setPhoneNumbers(cachedPhoneNumbers);
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
        body: { endpoint: "/phone-number", method: "GET" },
      });

      if (functionError) {
        console.error("Function error:", functionError);
        throw new Error(functionError.message);
      }

      if (data?.error) {
        console.error("Vapi API error:", data);
        throw new Error(data.error);
      }

      console.log("Vapi phone numbers response:", data);

      const phoneNumbersData = Array.isArray(data) ? data : [];
      console.log(`Fetched ${phoneNumbersData.length} phone numbers from Vapi`);
      
      setPhoneNumbers(phoneNumbersData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch phone numbers";
      setError(errorMessage);
      console.error("Error fetching Vapi phone numbers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch) {
      fetchPhoneNumbers();
    }
  }, [autoFetch]);

  return {
    phoneNumbers,
    loading,
    error,
    refresh: fetchPhoneNumbers,
  };
};
