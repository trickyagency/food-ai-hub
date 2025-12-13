import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ShoppingCart, 
  CheckCircle2, 
  Clock, 
  XCircle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  Package
} from "lucide-react";
import { OrderStats } from "@/hooks/useOrders";

interface OrderAnalyticsEnhancedProps {
  stats: OrderStats | null;
  loading: boolean;
}

export const OrderAnalyticsEnhanced = ({ stats, loading }: OrderAnalyticsEnhancedProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="bg-card border border-border/60">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="w-3 h-3 text-success" />;
    if (current < previous) return <TrendingDown className="w-3 h-3 text-destructive" />;
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  };

  const getTrendText = (current: number, previous: number, isCurrency = false) => {
    if (previous === 0) {
      if (current === 0) return "No change";
      return isCurrency ? `+$${current.toFixed(2)}` : `+${current}`;
    }
    const change = ((current - previous) / previous * 100).toFixed(1);
    const prefix = current >= previous ? "+" : "";
    return `${prefix}${change}% vs yesterday`;
  };

  const getTrendColor = (current: number, previous: number) => {
    if (current > previous) return "text-success";
    if (current < previous) return "text-destructive";
    return "text-muted-foreground";
  };

  const statCards = [
    {
      title: "Total Orders",
      value: stats.total.toLocaleString(),
      icon: ShoppingCart,
      color: "text-primary",
      bgColor: "bg-primary/10",
      trend: getTrendText(stats.todayOrders, stats.yesterdayOrders),
      trendIcon: getTrendIcon(stats.todayOrders, stats.yesterdayOrders),
      trendColor: getTrendColor(stats.todayOrders, stats.yesterdayOrders),
      subtitle: `${stats.todayOrders} today`
    },
    {
      title: "Confirmed",
      value: stats.confirmed.toLocaleString(),
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
      subtitle: "Awaiting prep"
    },
    {
      title: "Preparing",
      value: stats.preparing.toLocaleString(),
      icon: Package,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      subtitle: "In progress"
    },
    {
      title: "Completed",
      value: stats.completed.toLocaleString(),
      icon: CheckCircle2,
      color: "text-success",
      bgColor: "bg-success/10",
      subtitle: `${stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : 0}% completion rate`
    },
    {
      title: "Cancelled",
      value: stats.cancelled.toLocaleString(),
      icon: XCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      subtitle: `${stats.total > 0 ? ((stats.cancelled / stats.total) * 100).toFixed(1) : 0}% cancel rate`
    },
    {
      title: "Total Revenue",
      value: `$${stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "text-success",
      bgColor: "bg-success/10",
      trend: getTrendText(stats.todayRevenue, stats.yesterdayRevenue, true),
      trendIcon: getTrendIcon(stats.todayRevenue, stats.yesterdayRevenue),
      trendColor: getTrendColor(stats.todayRevenue, stats.yesterdayRevenue),
      subtitle: `$${stats.todayRevenue.toFixed(2)} today`
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card 
            key={stat.title} 
            className="bg-card border border-border/60 shadow-sm hover:shadow-md transition-all duration-200 group"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg ${stat.bgColor} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                {stat.trendIcon && (
                  <div className={`flex items-center gap-1 ${stat.trendColor}`}>
                    {stat.trendIcon}
                  </div>
                )}
              </div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                {stat.title}
              </p>
              <p className="text-2xl font-bold text-foreground mb-1">
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {stat.trend || stat.subtitle}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
