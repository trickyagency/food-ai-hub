import DashboardLayout from "@/components/DashboardLayout";
import { PageTransition } from "@/components/PageTransition";
import { useUserRole } from "@/hooks/useUserRole";
import { useVapiAnalytics } from "@/hooks/useVapiAnalytics";
import { useVapiCalls } from "@/hooks/useVapiCalls";
import VapiMetricsGrid from "@/components/dashboard/VapiMetricsGrid";
import CallStatisticsChart from "@/components/dashboard/CallStatisticsChart";
import CostBreakdownWidget from "@/components/dashboard/CostBreakdownWidget";
import PerformanceTrendsChart from "@/components/dashboard/PerformanceTrendsChart";
import VapiCallLogsTable from "@/components/dashboard/VapiCallLogsTable";
import VapiConnectionStatus from "@/components/dashboard/VapiConnectionStatus";

const Index = () => {
  const { role } = useUserRole();
  
  // Fetch Vapi analytics and calls with auto-refresh every 60 seconds
  const { analytics, loading: analyticsLoading, refresh: refreshAnalytics, lastUpdated } = useVapiAnalytics({
    autoRefresh: true,
    refreshInterval: 60000,
  });
  const { calls, loading: callsLoading, refresh: refreshCalls } = useVapiCalls({
    autoRefresh: true,
    refreshInterval: 60000,
  });

  // Define what each role can see
  const canSeeAdvancedMetrics = role === "owner" || role === "admin" || role === "manager";
  const canSeeCallLogs = role !== "viewer";

  const handleRefresh = () => {
    refreshAnalytics();
    refreshCalls();
  };

  const isLoading = analyticsLoading || callsLoading;

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="p-8 lg:p-10 space-y-8 max-w-[1800px] mx-auto dashboard-content bg-background min-h-screen">
          {/* Header */}
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-foreground tracking-tight">
                Voice AI Agent Dashboard
              </h1>
              <p className="text-base text-muted-foreground">
                Real-time call analytics and performance metrics from your Vapi account
              </p>
            </div>
            
            {/* Connection Status */}
            <VapiConnectionStatus 
              onRefresh={handleRefresh}
              lastUpdated={lastUpdated}
              isRefreshing={isLoading}
            />
          </div>

          {/* Dashboard Content */}
          {canSeeAdvancedMetrics ? (
            <div className="space-y-8">
              {/* Show loading or error states */}
              {isLoading && calls.length === 0 ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-lg font-semibold text-foreground">
                      Loading Vapi data...
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Fetching your call analytics and metrics
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Metrics Grid */}
                  <VapiMetricsGrid analytics={analytics} loading={false} />

                  {/* Cost Breakdown */}
                  <CostBreakdownWidget analytics={analytics} />

                  {/* Charts */}
                  <CallStatisticsChart analytics={analytics} />

                  {/* Performance Trends */}
                  <PerformanceTrendsChart />

                  {/* Call Logs */}
                  {canSeeCallLogs && (
                    <VapiCallLogsTable calls={calls} loading={false} />
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center space-y-3">
                <p className="text-lg font-semibold text-foreground">
                  Limited Access
                </p>
                <p className="text-sm text-muted-foreground max-w-md">
                  You don't have permission to view dashboard analytics. Contact your administrator for access.
                </p>
              </div>
            </div>
          )}
        </div>
      </PageTransition>
    </DashboardLayout>
  );
};

export default Index;
