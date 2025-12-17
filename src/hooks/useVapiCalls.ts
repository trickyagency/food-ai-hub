import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeWithRetry } from "@/lib/supabaseHelpers";
import { useAuth } from "@/contexts/AuthContext";

export interface CostBreakdown {
  transport: number;
  stt: number;
  llm: number;
  tts: number;
  vapi: number;
  total: number;
}

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
  costBreakdown?: CostBreakdown;
  endedReason?: string;
  createdAt: string;
  updatedAt: string;
  transcript?: string;
  recordingUrl?: string;
  summary?: string;
}

// Helper function to transform Vapi costs array to object format
const transformCostsArray = (costs: any): CostBreakdown | undefined => {
  const breakdown: CostBreakdown = { stt: 0, llm: 0, tts: 0, vapi: 0, transport: 0, total: 0 };
  
  // Handle array format from Vapi API
  if (Array.isArray(costs)) {
    costs.forEach((cost: any) => {
      const type = (cost.type || '').toLowerCase();
      const costValue = Number(cost.cost) || 0;
      
      if (type.includes('stt') || type.includes('transcriber')) {
        breakdown.stt += costValue;
      } else if (type.includes('llm') || type.includes('model')) {
        breakdown.llm += costValue;
      } else if (type.includes('tts') || type.includes('voice')) {
        breakdown.tts += costValue;
      } else if (type.includes('vapi')) {
        breakdown.vapi += costValue;
      } else if (type.includes('transport')) {
        breakdown.transport += costValue;
      }
      breakdown.total += costValue;
    });
    return breakdown;
  }
  
  // Handle object format (already in correct format or from cache)
  if (costs && typeof costs === 'object') {
    return {
      stt: Number(costs.stt) || 0,
      llm: Number(costs.llm) || 0,
      tts: Number(costs.tts) || 0,
      vapi: Number(costs.vapi) || 0,
      transport: Number(costs.transport) || 0,
      total: Number(costs.total) || 0,
    };
  }
  
  return undefined;
};

interface UseVapiCallsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const useVapiCalls = (options: UseVapiCallsOptions = {}) => {
  const { autoRefresh = false, refreshInterval = 60000 } = options;
  const { isAuthenticated, isInitialized, loading: authLoading } = useAuth();
  const [calls, setCalls] = useState<VapiCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchCalls = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Fetching calls from Supabase cache...");

      // First, try to get from Supabase cache - order by started_at with created_at fallback
      const { data: cachedCalls, error: cacheError } = await supabase
        .from("vapi_calls")
        .select("*")
        .order("started_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

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
          costBreakdown: transformCostsArray(call.cost_breakdown),
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

        // Trigger background sync with retry
        console.log("Triggering background sync...");
        invokeWithRetry("vapi-sync").catch(err => {
          console.error("Background sync failed:", err);
        });

        return;
      }

      console.log("No cached data, fetching from Vapi API...");

      const { data, error: functionError } = await invokeWithRetry("vapi-proxy", {
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
      
      // Calculate duration from startedAt and endedAt timestamps
      const calculateDuration = (startedAt?: string, endedAt?: string): number => {
        if (!startedAt || !endedAt) return 0;
        const start = new Date(startedAt).getTime();
        const end = new Date(endedAt).getTime();
        return Math.round((end - start) / 1000); // seconds
      };

      // Map Vapi response to VapiCall interface with calculated duration
      const mappedCalls = callsData.map((call: any) => ({
        id: call.id,
        type: call.type,
        status: call.status,
        customer: call.customer,
        phoneNumber: call.phoneNumber,
        duration: call.duration ?? calculateDuration(call.startedAt, call.endedAt),
        cost: call.cost,
        costBreakdown: transformCostsArray(call.costs),
        endedReason: call.endedReason,
        createdAt: call.createdAt,
        updatedAt: call.updatedAt,
        transcript: call.transcript,
        recordingUrl: call.recordingUrl,
        summary: call.summary,
        startedAt: call.startedAt,
        endedAt: call.endedAt,
      }));
      
      // Sort by startedAt (descending) with createdAt fallback for null values
      mappedCalls.sort((a: any, b: any) => {
        const dateA = new Date(a.startedAt || a.createdAt).getTime();
        const dateB = new Date(b.startedAt || b.createdAt).getTime();
        return dateB - dateA;
      });
      
      setCalls(mappedCalls);
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
    // Wait for auth to be ready before fetching
    if (!isInitialized || authLoading || !isAuthenticated) {
      return;
    }
    
    // Delay to let auth state fully settle after login
    const timeoutId = setTimeout(() => {
      fetchCalls();
    }, 300);
    
    
    // Set up real-time subscription for live updates
    const channel = supabase
      .channel('vapi-calls-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vapi_calls'
        },
        (payload) => {
          console.log('Real-time call update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newCall = {
              id: payload.new.id,
              type: payload.new.type,
              status: payload.new.status,
              customer: {
                number: payload.new.customer_number,
                name: payload.new.customer_name,
              },
              phoneNumberId: payload.new.phone_number_id,
              phoneNumber: payload.new.phone_number ? { number: payload.new.phone_number } : undefined,
              assistantId: payload.new.assistant_id,
              duration: payload.new.duration,
              cost: payload.new.cost,
              costBreakdown: transformCostsArray(payload.new.cost_breakdown),
              endedReason: payload.new.ended_reason,
              transcript: payload.new.transcript,
              recordingUrl: payload.new.recording_url,
              summary: payload.new.summary,
              messages: payload.new.messages,
              analysis: payload.new.analysis,
              startedAt: payload.new.started_at,
              endedAt: payload.new.ended_at,
              createdAt: payload.new.created_at,
              updatedAt: payload.new.updated_at,
            };
            setCalls(prev => [newCall, ...prev]);
            setLastUpdated(new Date());
          } else if (payload.eventType === 'UPDATE') {
            const updatedCall = {
              id: payload.new.id,
              type: payload.new.type,
              status: payload.new.status,
              customer: {
                number: payload.new.customer_number,
                name: payload.new.customer_name,
              },
              phoneNumberId: payload.new.phone_number_id,
              phoneNumber: payload.new.phone_number ? { number: payload.new.phone_number } : undefined,
              assistantId: payload.new.assistant_id,
              duration: payload.new.duration,
              cost: payload.new.cost,
              costBreakdown: transformCostsArray(payload.new.cost_breakdown),
              endedReason: payload.new.ended_reason,
              transcript: payload.new.transcript,
              recordingUrl: payload.new.recording_url,
              summary: payload.new.summary,
              messages: payload.new.messages,
              analysis: payload.new.analysis,
              startedAt: payload.new.started_at,
              endedAt: payload.new.ended_at,
              createdAt: payload.new.created_at,
              updatedAt: payload.new.updated_at,
            };
            setCalls(prev => prev.map(call => call.id === updatedCall.id ? updatedCall : call));
            setLastUpdated(new Date());
          }
        }
      )
      .subscribe();

    if (autoRefresh) {
      const interval = setInterval(fetchCalls, refreshInterval);
      return () => {
        clearTimeout(timeoutId);
        clearInterval(interval);
        supabase.removeChannel(channel);
      };
    }

    return () => {
      clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [autoRefresh, refreshInterval, isAuthenticated, isInitialized, authLoading]);

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
