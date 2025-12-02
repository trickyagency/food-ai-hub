import { useState, useEffect } from "react";
import { useVapiCalls, VapiCall } from "./useVapiCalls";

export interface VapiAnalytics {
  totalCalls: number;
  totalMinutes: number;
  totalCost: number;
  successRate: number;
  callsByType: {
    inbound: number;
    outbound: number;
    web: number;
  };
  callsByStatus: {
    completed: number;
    failed: number;
    ongoing: number;
    other: number;
  };
  costBreakdown: {
    stt: number;
    llm: number;
    tts: number;
    vapi: number;
    transport: number;
  };
  avgDuration: number;
  trends: {
    callsChange: number;
    minutesChange: number;
    costChange: number;
  };
}

interface UseVapiAnalyticsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  calls?: VapiCall[]; // Optional: provide specific calls to analyze
}

export const useVapiAnalytics = (options: UseVapiAnalyticsOptions = {}) => {
  const { calls: allCalls, loading, error, refresh, lastUpdated } = useVapiCalls({
    autoRefresh: options.autoRefresh,
    refreshInterval: options.refreshInterval,
  });
  
  // Use provided calls or all calls
  const calls = options.calls || allCalls;
  
  const [analytics, setAnalytics] = useState<VapiAnalytics>({
    totalCalls: 0,
    totalMinutes: 0,
    totalCost: 0,
    successRate: 0,
    callsByType: { inbound: 0, outbound: 0, web: 0 },
    callsByStatus: { completed: 0, failed: 0, ongoing: 0, other: 0 },
    costBreakdown: { stt: 0, llm: 0, tts: 0, vapi: 0, transport: 0 },
    avgDuration: 0,
    trends: { callsChange: 0, minutesChange: 0, costChange: 0 },
  });

  useEffect(() => {
    if (calls.length === 0) {
      return;
    }

    console.log("Calculating analytics from calls:", calls.length);
    
    // Calculate analytics from calls data
    const totalCalls = calls.length;
    const totalMinutes = calls.reduce((sum, call) => {
      const minutes = (call.duration || 0) / 60;
      console.log(`Call ${call.id}: duration=${call.duration}s, minutes=${minutes}`);
      return sum + minutes;
    }, 0);
    
    console.log(`Total minutes calculated: ${totalMinutes}`);
    
    const totalCost = calls.reduce((sum, call) => sum + (call.cost || 0), 0);

    // Calculate success rate
    const completedCalls = calls.filter((call) => call.status === "ended" && call.endedReason !== "customer-did-not-answer").length;
    const successRate = totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0;

    // Calls by type
    const callsByType = {
      inbound: calls.filter((call) => call.type === "inboundPhoneCall").length,
      outbound: calls.filter((call) => call.type === "outboundPhoneCall").length,
      web: calls.filter((call) => call.type === "webCall").length,
    };

    // Calls by status
    const callsByStatus = {
      completed: calls.filter((call) => call.status === "ended").length,
      failed: calls.filter((call) => call.endedReason === "pipeline-error-openai-voice-failed" || call.endedReason === "assistant-error").length,
      ongoing: calls.filter((call) => call.status === "in-progress").length,
      other: calls.filter((call) => !["ended", "in-progress"].includes(call.status)).length,
    };

    // Cost breakdown
    const costBreakdown = calls.reduce(
      (acc, call) => {
        if (call.costBreakdown) {
          acc.stt += call.costBreakdown.stt || 0;
          acc.llm += call.costBreakdown.llm || 0;
          acc.tts += call.costBreakdown.tts || 0;
          acc.vapi += call.costBreakdown.vapi || 0;
          acc.transport += call.costBreakdown.transport || 0;
        }
        return acc;
      },
      { stt: 0, llm: 0, tts: 0, vapi: 0, transport: 0 }
    );

    // Average duration
    const avgDuration = totalCalls > 0 ? totalMinutes / totalCalls : 0;

    // Mock trends (would need historical data for real calculation)
    const trends = {
      callsChange: 12.5,
      minutesChange: 8.3,
      costChange: 5.2,
    };

    setAnalytics({
      totalCalls,
      totalMinutes,
      totalCost,
      successRate,
      callsByType,
      callsByStatus,
      costBreakdown,
      avgDuration,
      trends,
    });
  }, [calls]);

  return {
    analytics,
    loading,
    error,
    refresh,
    lastUpdated,
    allCalls, // Return all calls for filtering
  };
};
