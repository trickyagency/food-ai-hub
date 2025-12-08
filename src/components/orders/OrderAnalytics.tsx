import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Clock, CheckCircle, XCircle, DollarSign, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface OrderStats {
  total: number;
  confirmed: number;
  preparing: number;
  completed: number;
  cancelled: number;
  totalRevenue: number;
}

export const OrderAnalytics = () => {
  const [stats, setStats] = useState<OrderStats>({
    total: 0,
    confirmed: 0,
    preparing: 0,
    completed: 0,
    cancelled: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase.from("orders").select("status, total");

        if (error) throw error;

        const newStats: OrderStats = {
          total: data?.length || 0,
          confirmed: 0,
          preparing: 0,
          completed: 0,
          cancelled: 0,
          totalRevenue: 0,
        };

        data?.forEach((order) => {
          const status = order.status || "confirmed";
          if (status in newStats) {
            newStats[status as keyof Omit<OrderStats, "total" | "totalRevenue">]++;
          }
          if (status !== "cancelled") {
            newStats.totalRevenue += Number(order.total) || 0;
          }
        });

        setStats(newStats);
      } catch (error) {
        console.error("Error fetching order stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Total Orders",
      value: stats.total,
      icon: ShoppingCart,
      color: "text-primary",
    },
    {
      title: "Confirmed",
      value: stats.confirmed,
      icon: CheckCircle,
      color: "text-blue-500",
      percentage: stats.total > 0 ? ((stats.confirmed / stats.total) * 100).toFixed(1) : "0",
    },
    {
      title: "Preparing",
      value: stats.preparing,
      icon: Clock,
      color: "text-amber-500",
    },
    {
      title: "Completed",
      value: stats.completed,
      icon: Package,
      color: "text-green-500",
      percentage: stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : "0",
    },
    {
      title: "Cancelled",
      value: stats.cancelled,
      icon: XCircle,
      color: "text-destructive",
      percentage: stats.total > 0 ? ((stats.cancelled / stats.total) * 100).toFixed(1) : "0",
    },
    {
      title: "Total Revenue",
      value: `$${stats.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: "text-green-600",
      isRevenue: true,
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-20" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statCards.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stat.isRevenue ? stat.value : stat.value}
            </div>
            {stat.percentage && (
              <p className="text-xs text-muted-foreground mt-1">
                {stat.percentage}% of total
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
