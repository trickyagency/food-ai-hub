import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import TimeFilter from "@/components/dashboard/TimeFilter";
import DateRangePicker from "@/components/dashboard/DateRangePicker";
import QuickDateRanges from "@/components/dashboard/QuickDateRanges";
import { ExportData } from "@/components/dashboard/ExportData";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { DashboardCustomizer } from "@/components/dashboard/DashboardCustomizer";
import { MetricCardsSkeletonGrid } from "@/components/dashboard/MetricCardSkeleton";
import { PageTransition } from "@/components/PageTransition";
import { useUserRole } from "@/hooks/useUserRole";
import { useDashboardLayout } from "@/hooks/useDashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { DateRange } from "react-day-picker";

type TimePeriod = "hours" | "days" | "weeks" | "months" | "years";

const Index = () => {
  const { role } = useUserRole();
  const { user } = useAuth();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("days");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  // Dashboard layout management
  const { config, saveLayout, toggleWidget, resetLayout } = useDashboardLayout(user?.id);

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
        <div className="p-8 lg:p-10 space-y-8 max-w-[1800px] mx-auto dashboard-content bg-background min-h-screen">
        {/* Header */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-foreground tracking-tight">
                Dashboard
              </h1>
              <p className="text-base text-muted-foreground">
                Real-time call analytics and performance metrics
              </p>
            </div>
            {canSeeAdvancedMetrics && (
              <div className="flex flex-wrap items-center gap-3 lg:pt-1">
                <TimeFilter selected={timePeriod} onChange={setTimePeriod} />
                <DateRangePicker 
                  dateRange={dateRange} 
                  onDateRangeChange={setDateRange}
                />
                <DashboardCustomizer
                  visibleWidgets={config.visibleWidgets}
                  onToggleWidget={toggleWidget}
                  onResetLayout={resetLayout}
                  onSaveLayout={() => saveLayout(config.layouts)}
                />
                <ExportData metrics={metrics} />
              </div>
            )}
          </div>
          
          {/* Quick Date Ranges */}
          {canSeeAdvancedMetrics && (
            <div className="pb-4 border-b border-border">
              <QuickDateRanges onSelectRange={setDateRange} />
            </div>
          )}
        </div>

        {/* Dashboard Grid with Customizable Widgets */}
        {isLoading ? (
          <div className="space-y-8">
            <MetricCardsSkeletonGrid />
          </div>
        ) : (
          <DashboardGrid
            layouts={config.layouts}
            visibleWidgets={config.visibleWidgets}
            dateRange={dateRange}
            canSeeAdvancedMetrics={canSeeAdvancedMetrics}
            canSeeCallLogs={canSeeCallLogs}
            onLayoutChange={saveLayout}
          />
        )}
        </div>
      </PageTransition>
    </DashboardLayout>
  );
};

export default Index;
