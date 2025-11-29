import SimpleMetricCard from "@/components/dashboard/SimpleMetricCard";
import { Phone, TrendingUp, Clock, CheckCircle2, PhoneForwarded } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DateRange } from "react-day-picker";
import { generateData } from "@/components/dashboard/SimpleCharts";

interface CallMetricsWidgetProps {
  canSeeAdvancedMetrics: boolean;
  dateRange?: DateRange;
}

export const CallMetricsWidget = ({ canSeeAdvancedMetrics, dateRange }: CallMetricsWidgetProps) => {
  // Calculate metrics based on date range
  const days = dateRange?.from && dateRange?.to
    ? Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 7;
  
  const data = generateData(Math.min(days, 30));
  
  // Calculate totals from the data
  const totalCalls = data.reduce((sum, day) => sum + day.calls, 0);
  const totalSuccess = data.reduce((sum, day) => sum + day.success, 0);
  const totalOrders = data.reduce((sum, day) => sum + day.orders, 0);
  const successRate = totalCalls > 0 ? ((totalSuccess / totalCalls) * 100).toFixed(1) : "0.0";
  const conversionRate = totalCalls > 0 ? ((totalOrders / totalCalls) * 100).toFixed(1) : "0.0";
  
  // Calculate forwarded calls (approximately 27% of total)
  const forwardedCalls = Math.floor(totalCalls * 0.27);
  
  // Calculate average duration in minutes and seconds
  const avgDurationSeconds = 204; // Fixed average
  const avgMinutes = Math.floor(avgDurationSeconds / 60);
  const avgSeconds = avgDurationSeconds % 60;

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
        <SimpleMetricCard
          title="Total Calls"
          value={totalCalls.toLocaleString()}
          change="+12.5%"
          icon={Phone}
          trend="up"
          subtitle="vs. last period"
        />
        <SimpleMetricCard
          title="Forwarded"
          value={forwardedCalls.toLocaleString()}
          change="+8.2%"
          icon={PhoneForwarded}
          trend="up"
          subtitle="calls redirected"
        />
        <SimpleMetricCard
          title="Success Rate"
          value={`${successRate}%`}
          change="+2.4%"
          icon={CheckCircle2}
          trend="up"
          subtitle="completion rate"
        />
        
        {canSeeAdvancedMetrics ? (
          <>
            <SimpleMetricCard
              title="Avg. Duration"
              value={`${avgMinutes}m ${avgSeconds}s`}
              change="-0.8%"
              icon={Clock}
              trend="down"
              subtitle="call length"
            />
            <SimpleMetricCard
              title="Conversion"
              value={`${conversionRate}%`}
              change="+5.1%"
              icon={TrendingUp}
              trend="up"
              subtitle="order conversion"
            />
          </>
        ) : (
          <>
            <Card className="col-span-1 bg-muted border-border hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center justify-center min-h-[120px]">
                <p className="text-sm text-muted-foreground text-center font-medium">
                  Contact admin for access
                </p>
              </CardContent>
            </Card>
            <Card className="col-span-1 bg-muted border-border hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center justify-center min-h-[120px]">
                <p className="text-sm text-muted-foreground text-center font-medium">
                  Contact admin for access
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};