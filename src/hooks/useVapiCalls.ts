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

      console.log("Fetching calls from Vapi...");

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
