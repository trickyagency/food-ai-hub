import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface VapiCall {
  id: string;
  type: "inboundPhoneCall" | "outboundPhoneCall" | "webCall";
  status: "ended" | "queued" | "ringing" | "in-progress";
  customer?: {
    number?: string;
    name?: string;
  };
  phoneNumber?: {
    number?: string;
  };
  duration?: number;
  cost?: number;
  costBreakdown?: {
    transport?: number;
    stt?: number;
    llm?: number;
    tts?: number;
    vapi?: number;
    total?: number;
  };
  endedReason?: string;
  createdAt: string;
  updatedAt: string;
  transcript?: string;
  recordingUrl?: string;
  summary?: string;
}

interface UseVapiCallsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const useVapiCalls = (options: UseVapiCallsOptions = {}) => {
  const { autoRefresh = false, refreshInterval = 60000 } = options;
  const [calls, setCalls] = useState<VapiCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchCalls = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Fetching calls from Supabase cache...");

      // First, try to get from Supabase cache
      const { data: cachedCalls, error: cacheError } = await supabase
        .from("vapi_calls")
        .select("*")
        .order("started_at", { ascending: false });

      if (!cacheError && cachedCalls && cachedCalls.length > 0) {
        console.log(`Retrieved ${cachedCalls.length} calls from cache`);
        const mappedCalls = cachedCalls.map((call: any) => ({
          id: call.id,
          type: call.type,
          status: call.status,
          customer: {
            number: call.customer_number,
            name: call.customer_name,
          },
          phoneNumberId: call.phone_number_id,
          phoneNumber: call.phone_number ? { number: call.phone_number } : undefined,
          assistantId: call.assistant_id,
          duration: call.duration,
          cost: call.cost,
          costs: call.cost_breakdown,
          endedReason: call.ended_reason,
          transcript: call.transcript,
          recordingUrl: call.recording_url,
          summary: call.summary,
          messages: call.messages,
          analysis: call.analysis,
          startedAt: call.started_at,
          endedAt: call.ended_at,
          createdAt: call.created_at,
          updatedAt: call.updated_at,
        }));
        setCalls(mappedCalls);
        setLastUpdated(new Date());
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
        body: { endpoint: "/call?limit=100" },
      });

      if (functionError) {
        console.error("Function error:", functionError);
        throw new Error(functionError.message);
      }

      if (data?.error) {
        console.error("Vapi API error:", data);
        throw new Error(data.error);
      }

      console.log("Vapi response:", data);

      // Vapi returns an array of calls directly
      const callsData = Array.isArray(data) ? data : [];
      console.log(`Fetched ${callsData.length} calls from Vapi`);
      
      setCalls(callsData);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch calls";
      setError(errorMessage);
      console.error("Error fetching Vapi calls:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();

    if (autoRefresh) {
      const interval = setInterval(fetchCalls, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const refresh = () => {
    fetchCalls();
  };

  return {
    calls,
    loading,
    error,
    refresh,
    lastUpdated,
  };
};
