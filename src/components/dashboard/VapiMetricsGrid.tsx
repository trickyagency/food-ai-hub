import { Card, CardContent } from "@/components/ui/card";
import { Phone, Clock, DollarSign, TrendingUp, ArrowUp, ArrowDown } from "lucide-react";
import { VapiAnalytics } from "@/hooks/useVapiAnalytics";
import { formatTotalDuration } from "@/lib/utils";

interface VapiMetricsGridProps {
  analytics: VapiAnalytics;
  loading?: boolean;
}

const VapiMetricsGrid = ({ analytics, loading }: VapiMetricsGridProps) => {
  const metrics = [
    {
      title: "Total Calls",
      value: analytics.totalCalls.toLocaleString(),
      icon: Phone,
      trend: analytics.trends.callsChange,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-950/30",
    },
    {
      title: "Total Duration",
      value: formatTotalDuration(analytics.totalMinutes),
      icon: Clock,
      trend: analytics.trends.minutesChange,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-950/30",
    },
    {
      title: "Total Cost",
      value: `$${analytics.totalCost.toFixed(2)}`,
      icon: DollarSign,
      trend: analytics.trends.costChange,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-950/30",
    },
    {
      title: "Success Rate",
      value: `${analytics.successRate.toFixed(1)}%`,
      icon: TrendingUp,
      trend: 2.1,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-100 dark:bg-orange-950/30",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-border/50 shadow-sm">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-10 w-10 bg-muted rounded-lg" />
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-24" />
                  <div className="h-8 bg-muted rounded w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        const isPositive = metric.trend >= 0;

        return (
          <Card
            key={metric.title}
            className="border-border/50 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className={`w-12 h-12 rounded-xl ${metric.bgColor} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${metric.color}`} />
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${
                  isPositive 
                    ? "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400" 
                    : "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400"
                }`}>
                  {isPositive ? (
                    <ArrowUp className="w-3 h-3" />
                  ) : (
                    <ArrowDown className="w-3 h-3" />
                  )}
                  {Math.abs(metric.trend)}%
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {metric.title}
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {metric.value}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default VapiMetricsGrid;
