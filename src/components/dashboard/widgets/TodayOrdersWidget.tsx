import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  confirmed: number;
  preparing: number;
  completed: number;
  cancelled: number;
  yesterdayOrders: number;
  yesterdayRevenue: number;
}

export function TodayOrdersWidget() {
  const [stats, setStats] = useState<OrderStats>({
    totalOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    confirmed: 0,
    preparing: 0,
    completed: 0,
    cancelled: 0,
    yesterdayOrders: 0,
    yesterdayRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayISO = yesterday.toISOString();

      // Fetch today's orders
      const { data: todayOrders, error: todayError } = await supabase
        .from("orders")
        .select("*")
        .gte("created_at", todayISO);

      if (todayError) throw todayError;

      // Fetch yesterday's orders for comparison
      const { data: yesterdayOrders, error: yesterdayError } = await supabase
        .from("orders")
        .select("total")
        .gte("created_at", yesterdayISO)
        .lt("created_at", todayISO);

      if (yesterdayError) throw yesterdayError;

      const orders = todayOrders || [];
      const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
      const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

      const yesterdayRevenue = (yesterdayOrders || []).reduce(
        (sum, order) => sum + Number(order.total || 0),
        0
      );

      setStats({
        totalOrders: orders.length,
        totalRevenue,
        avgOrderValue,
        confirmed: orders.filter((o) => o.status === "confirmed").length,
        preparing: orders.filter((o) => o.status === "preparing").length,
        completed: orders.filter((o) => o.status === "completed").length,
        cancelled: orders.filter((o) => o.status === "cancelled").length,
        yesterdayOrders: yesterdayOrders?.length || 0,
        yesterdayRevenue,
      });
    } catch (error) {
      console.error("Error fetching order stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("today-orders-widget")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const ordersTrend = stats.yesterdayOrders > 0 
    ? ((stats.totalOrders - stats.yesterdayOrders) / stats.yesterdayOrders) * 100 
    : 0;
  const revenueTrend = stats.yesterdayRevenue > 0 
    ? ((stats.totalRevenue - stats.yesterdayRevenue) / stats.yesterdayRevenue) * 100 
    : 0;

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
          <Skeleton className="h-10" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-primary" />
          Today's Orders
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/orders" className="text-xs text-muted-foreground hover:text-primary">
            View All →
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{stats.totalOrders}</p>
            <p className="text-xs text-muted-foreground">Orders</p>
            {ordersTrend !== 0 && (
              <div className={`flex items-center justify-center gap-1 text-xs ${ordersTrend > 0 ? "text-green-500" : "text-red-500"}`}>
                {ordersTrend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(ordersTrend).toFixed(0)}%
              </div>
            )}
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">${stats.totalRevenue.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Revenue</p>
            {revenueTrend !== 0 && (
              <div className={`flex items-center justify-center gap-1 text-xs ${revenueTrend > 0 ? "text-green-500" : "text-red-500"}`}>
                {revenueTrend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(revenueTrend).toFixed(0)}%
              </div>
            )}
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">${stats.avgOrderValue.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Avg Order</p>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/50">
          <div className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4 text-blue-500" />
            <span className="text-muted-foreground">{stats.confirmed} Confirmed</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-amber-500" />
            <span className="text-muted-foreground">{stats.preparing} Preparing</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground">{stats.completed} Completed</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-muted-foreground">{stats.cancelled} Cancelled</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
