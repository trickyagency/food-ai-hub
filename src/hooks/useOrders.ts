import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

export interface Order {
  id: string;
  customer_name: string | null;
  customer_number: string;
  items: Json;
  subtotal: number | null;
  tax: number | null;
  total: number;
  status: string | null;
  special_instructions: string | null;
  estimated_time: number | null;
  call_id: string;
  user_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface OrderStats {
  total: number;
  confirmed: number;
  preparing: number;
  completed: number;
  cancelled: number;
  revenue: number;
  avgOrderValue: number;
  todayOrders: number;
  todayRevenue: number;
  yesterdayOrders: number;
  yesterdayRevenue: number;
}

interface UseOrdersOptions {
  enableRealtime?: boolean;
  autoRefreshInterval?: number;
}

export const useOrders = (options: UseOrdersOptions = {}) => {
  const { enableRealtime = true, autoRefreshInterval = 0 } = options;
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const isMounted = useRef(true);
  const retryCount = useRef(0);
  const maxRetries = 3;

  const calculateStats = useCallback((orderData: Order[]): OrderStats => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    
    const todayOrders = orderData.filter(o => 
      o.created_at && new Date(o.created_at) >= todayStart
    );
    const yesterdayOrders = orderData.filter(o => 
      o.created_at && 
      new Date(o.created_at) >= yesterdayStart && 
      new Date(o.created_at) < todayStart
    );

    const statusCounts = orderData.reduce((acc, order) => {
      const status = order.status || 'confirmed';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalRevenue = orderData
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.total || 0), 0);
    
    const todayRevenue = todayOrders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.total || 0), 0);
    
    const yesterdayRevenue = yesterdayOrders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const completedOrders = orderData.filter(o => o.status !== 'cancelled');
    const avgOrderValue = completedOrders.length > 0 
      ? totalRevenue / completedOrders.length 
      : 0;

    return {
      total: orderData.length,
      confirmed: statusCounts['confirmed'] || 0,
      preparing: statusCounts['preparing'] || 0,
      completed: statusCounts['completed'] || 0,
      cancelled: statusCounts['cancelled'] || 0,
      revenue: totalRevenue,
      avgOrderValue,
      todayOrders: todayOrders.length,
      todayRevenue,
      yesterdayOrders: yesterdayOrders.length,
      yesterdayRevenue
    };
  }, []);

  const fetchOrders = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      if (isMounted.current) {
        setOrders(data || []);
        setStats(calculateStats(data || []));
        setLastUpdated(new Date());
        retryCount.current = 0;
      }
    } catch (err: any) {
      console.error("Error fetching orders:", err);
      
      if (retryCount.current < maxRetries) {
        retryCount.current++;
        const delay = Math.pow(2, retryCount.current) * 1000;
        setTimeout(() => fetchOrders(false), delay);
      } else {
        setError(err.message || "Failed to fetch orders");
      }
    } finally {
      if (isMounted.current && showLoading) {
        setLoading(false);
      }
    }
  }, [calculateStats]);

  const updateOrderStatus = useCallback(async (
    orderId: string, 
    newStatus: string,
    options?: { optimistic?: boolean }
  ): Promise<boolean> => {
    const { optimistic = true } = options || {};
    
    // Store original order for rollback
    const originalOrder = orders.find(o => o.id === orderId);
    if (!originalOrder) return false;

    // Optimistic update
    if (optimistic) {
      setOrders(prev => prev.map(o => 
        o.id === orderId ? { ...o, status: newStatus, updated_at: new Date().toISOString() } : o
      ));
    }

    try {
      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (updateError) throw updateError;

      // Recalculate stats
      setOrders(prev => {
        const updated = prev.map(o => 
          o.id === orderId ? { ...o, status: newStatus } : o
        );
        setStats(calculateStats(updated));
        return updated;
      });

      return true;
    } catch (err: any) {
      console.error("Error updating order status:", err);
      
      // Rollback optimistic update
      if (optimistic) {
        setOrders(prev => prev.map(o => 
          o.id === orderId ? originalOrder : o
        ));
      }
      
      toast.error("Failed to update order status", {
        description: err.message
      });
      
      return false;
    }
  }, [orders, calculateStats]);

  const refreshOrders = useCallback(() => {
    retryCount.current = 0;
    return fetchOrders(false);
  }, [fetchOrders]);

  // Initial fetch
  useEffect(() => {
    isMounted.current = true;
    fetchOrders();
    
    return () => {
      isMounted.current = false;
    };
  }, [fetchOrders]);

  // Real-time subscription
  useEffect(() => {
    if (!enableRealtime) return;

    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newOrder = payload.new as Order;
            setOrders(prev => {
              const updated = [newOrder, ...prev];
              setStats(calculateStats(updated));
              return updated;
            });
          } else if (payload.eventType === "UPDATE") {
            const updatedOrder = payload.new as Order;
            setOrders(prev => {
              const updated = prev.map(o => 
                o.id === updatedOrder.id ? updatedOrder : o
              );
              setStats(calculateStats(updated));
              return updated;
            });
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as Order).id;
            setOrders(prev => {
              const updated = prev.filter(o => o.id !== deletedId);
              setStats(calculateStats(updated));
              return updated;
            });
          }
          setLastUpdated(new Date());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enableRealtime, calculateStats]);

  // Auto-refresh interval
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;

    const interval = setInterval(() => {
      refreshOrders();
    }, autoRefreshInterval);

    return () => clearInterval(interval);
  }, [autoRefreshInterval, refreshOrders]);

  return {
    orders,
    stats,
    loading,
    error,
    lastUpdated,
    fetchOrders,
    refreshOrders,
    updateOrderStatus
  };
};
