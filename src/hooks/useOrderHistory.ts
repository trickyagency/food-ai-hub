import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface OrderStatusChange {
  id: string;
  order_id: string;
  previous_status: string | null;
  new_status: string;
  changed_by: string | null;
  changed_by_email: string | null;
  notes: string | null;
  created_at: string;
}

interface UseOrderHistoryOptions {
  enableRealtime?: boolean;
}

export const useOrderHistory = (orderId: string | null, options: UseOrderHistoryOptions = {}) => {
  const { enableRealtime = true } = options;
  
  const [history, setHistory] = useState<OrderStatusChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!orderId) {
      setHistory([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("order_status_history")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

      if (fetchError) throw fetchError;

      setHistory(data || []);
    } catch (err: any) {
      console.error("Error fetching order history:", err);
      setError(err.message || "Failed to fetch order history");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  // Initial fetch
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Real-time subscription
  useEffect(() => {
    if (!enableRealtime || !orderId) return;

    const channel = supabase
      .channel(`order-history-${orderId}`)
      .on(
        "postgres_changes",
        { 
          event: "INSERT", 
          schema: "public", 
          table: "order_status_history",
          filter: `order_id=eq.${orderId}`
        },
        (payload) => {
          const newChange = payload.new as OrderStatusChange;
          setHistory(prev => [...prev, newChange]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enableRealtime, orderId]);

  // Calculate duration between status changes
  const historyWithDurations = history.map((change, index) => {
    const nextChange = history[index + 1];
    let durationMinutes: number | null = null;
    
    if (nextChange) {
      const start = new Date(change.created_at).getTime();
      const end = new Date(nextChange.created_at).getTime();
      durationMinutes = Math.round((end - start) / 60000);
    }
    
    return {
      ...change,
      durationMinutes
    };
  });

  return {
    history: historyWithDurations,
    loading,
    error,
    refetch: fetchHistory
  };
};

// Helper function to log status change
export const logStatusChange = async (
  orderId: string,
  previousStatus: string | null,
  newStatus: string,
  userId?: string,
  userEmail?: string,
  notes?: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("order_status_history")
      .insert({
        order_id: orderId,
        previous_status: previousStatus,
        new_status: newStatus,
        changed_by: userId || null,
        changed_by_email: userEmail || "System",
        notes: notes || null
      });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Error logging status change:", err);
    return false;
  }
};
