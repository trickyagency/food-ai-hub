import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, CheckCircle, XCircle, Clock, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SmsStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  uniqueCustomers: number;
}

const SmsAnalytics = () => {
  const [stats, setStats] = useState<SmsStats>({ total: 0, sent: 0, failed: 0, pending: 0, uniqueCustomers: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from("sms_logs")
        .select("status, customer_number");

      if (error) throw error;

      // Count unique customers
      const uniqueCustomers = new Set(data?.map(s => s.customer_number) || []).size;

      const stats = {
        total: data?.length || 0,
        sent: data?.filter(s => s.status === "sent").length || 0,
        failed: data?.filter(s => s.status === "failed").length || 0,
        pending: data?.filter(s => s.status === "pending").length || 0,
        uniqueCustomers,
      };

      setStats(stats);
    } catch (error) {
      console.error("Error fetching SMS stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const successRate = stats.total > 0 ? ((stats.sent / stats.total) * 100).toFixed(1) : "0";
  const failureRate = stats.total > 0 ? ((stats.failed / stats.total) * 100).toFixed(1) : "0";
  const avgPerCustomer = stats.uniqueCustomers > 0 ? (stats.total / stats.uniqueCustomers).toFixed(1) : "0";

  const statCards = [
    {
      label: "Total SMS Sent",
      value: stats.total,
      icon: MessageSquare,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Delivered",
      value: stats.sent,
      subtext: `${successRate}% success rate`,
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Failed",
      value: stats.failed,
      subtext: `${failureRate}% failure rate`,
      icon: XCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      label: "Conversations",
      value: stats.uniqueCustomers,
      subtext: `${avgPerCustomer} avg messages/customer`,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border border-border/50">
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="border border-border/50 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              {stat.subtext && (
                <p className="text-xs text-muted-foreground mt-1">{stat.subtext}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default SmsAnalytics;
