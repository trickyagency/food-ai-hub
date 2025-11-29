import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import RadialMetricCard from "@/components/dashboard/RadialMetricCard";
import TimeFilter from "@/components/dashboard/TimeFilter";
import DateRangePicker from "@/components/dashboard/DateRangePicker";
import QuickDateRanges from "@/components/dashboard/QuickDateRanges";
import EnhancedCallLogTable from "@/components/dashboard/EnhancedCallLogTable";
import OrderMetrics from "@/components/dashboard/OrderMetrics";
import AdvancedAnalytics from "@/components/dashboard/AdvancedAnalytics";
import { ExportData } from "@/components/dashboard/ExportData";
import { MetricCardsSkeletonGrid } from "@/components/dashboard/MetricCardSkeleton";
import { ChartSkeleton } from "@/components/dashboard/ChartSkeleton";
import { PageTransition } from "@/components/PageTransition";
import { ProtectedFeature } from "@/components/ProtectedFeature";
import { Phone, TrendingUp, Clock, CheckCircle2, PhoneForwarded } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent } from "@/components/ui/card";
import { DateRange } from "react-day-picker";

type TimePeriod = "hours" | "days" | "weeks" | "months" | "years";

const Index = () => {
  const { role } = useUserRole();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("days");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  // Define what each role can see
  const canSeeAdvancedMetrics = role === "owner" || role === "admin" || role === "manager";
  const canSeeCallLogs = role !== "viewer";

  // Simulate data loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1200);
    
    return () => clearTimeout(timer);
  }, []);

  const metrics = {
    totalCalls: "1,247",
    forwardedCalls: "342",
    successRate: "94.2%",
    avgDuration: "3m 24s",
    conversionRate: "67.8%",
  };

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="p-6 sm:p-8 lg:p-10 space-y-8 max-w-[1800px] mx-auto dashboard-content">
        {/* Header */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
                Dashboard
              </h1>
              <p className="text-base text-muted-foreground max-w-2xl">
                Real-time analytics and insights for your AI calling agent
              </p>
            </div>
            {canSeeAdvancedMetrics && (
              <div className="flex flex-wrap items-center gap-3 lg:pt-1">
                <TimeFilter selected={timePeriod} onChange={setTimePeriod} />
                <DateRangePicker 
                  dateRange={dateRange} 
                  onDateRangeChange={setDateRange}
                />
                <ExportData metrics={metrics} />
              </div>
            )}
          </div>
          
          {/* Quick Date Ranges */}
          {canSeeAdvancedMetrics && (
            <div className="pb-6 border-b border-border/50">
              <QuickDateRanges onSelectRange={setDateRange} />
            </div>
          )}
        </div>

        {/* Call Metrics - Radial Charts */}
        {isLoading ? (
          <MetricCardsSkeletonGrid />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            <RadialMetricCard
            title="Total Calls"
            value="1,247"
            percentage={85}
            change="+12.5% from last period"
            icon={Phone}
            trend="up"
          />
          <RadialMetricCard
            title="Forwarded Calls"
            value="342"
            percentage={27}
            change="+8.2% from last period"
            icon={PhoneForwarded}
            trend="up"
            color="hsl(var(--info))"
          />
          <RadialMetricCard
            title="Success Rate"
            value="94.2%"
            percentage={94}
            change="+2.4% from last period"
            icon={CheckCircle2}
            trend="up"
            color="hsl(var(--success))"
          />
          
          {canSeeAdvancedMetrics ? (
            <>
              <RadialMetricCard
                title="Avg. Duration"
                value="3m 24s"
                percentage={68}
                change="-0.8% from last period"
                icon={Clock}
                trend="down"
                color="hsl(var(--warning))"
              />
              <RadialMetricCard
                title="Conversion Rate"
                value="67.8%"
                percentage={68}
                change="+5.1% from last period"
                icon={TrendingUp}
                trend="up"
                color="hsl(var(--accent))"
              />
            </>
          ) : (
            <>
              <Card className="col-span-1 bg-muted/30 border-dashed">
                <CardContent className="p-6 flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground text-center font-medium">
                    Upgrade for advanced metrics
                  </p>
                </CardContent>
              </Card>
              <Card className="col-span-1 bg-muted/30 border-dashed">
                <CardContent className="p-6 flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground text-center font-medium">
                    Upgrade for advanced metrics
                  </p>
                </CardContent>
              </Card>
            </>
          )}
          </div>
        )}

        {/* Order Metrics */}
        {canSeeAdvancedMetrics && (isLoading ? (
          <ChartSkeleton />
        ) : (
          <div className="animate-fade-in" style={{ animationDelay: "200ms" }}>
            <OrderMetrics dateRange={dateRange} />
          </div>
        ))}

        {/* Advanced Analytics */}
        {canSeeAdvancedMetrics && (isLoading ? (
          <ChartSkeleton />
        ) : (
          <div className="animate-fade-in" style={{ animationDelay: "300ms" }}>
            <AdvancedAnalytics dateRange={dateRange} />
          </div>
        ))}

        {/* Recent Calls - Enhanced with Conversation Viewer */}
        {canSeeCallLogs ? (
          <EnhancedCallLogTable dateRange={dateRange} />
        ) : (
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="py-12">
              <div className="text-center space-y-2">
                <p className="text-base font-medium text-muted-foreground">
                  You don't have permission to view call logs
                </p>
                <p className="text-sm text-muted-foreground">
                  Contact your administrator for access
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        </div>
      </PageTransition>
    </DashboardLayout>
  );
};

export default Index;
