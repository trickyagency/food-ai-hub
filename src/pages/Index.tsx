import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { PageTransition } from "@/components/PageTransition";
import { useUserRole } from "@/hooks/useUserRole";
import { useVapiAnalytics } from "@/hooks/useVapiAnalytics";
import { useVapiCalls } from "@/hooks/useVapiCalls";
import { useFilteredCalls } from "@/hooks/useFilteredCalls";
import VapiMetricsGrid from "@/components/dashboard/VapiMetricsGrid";
import CallStatisticsChart from "@/components/dashboard/CallStatisticsChart";
import CostBreakdownWidget from "@/components/dashboard/CostBreakdownWidget";
import PerformanceTrendsChart from "@/components/dashboard/PerformanceTrendsChart";
import VapiCallLogsTable from "@/components/dashboard/VapiCallLogsTable";
import VapiConnectionStatus from "@/components/dashboard/VapiConnectionStatus";
import CallFilters, { CallFilterOptions } from "@/components/dashboard/CallFilters";
import RealTimeCallMonitor from "@/components/dashboard/RealTimeCallMonitor";
import DetailedAnalytics from "@/components/dashboard/DetailedAnalytics";
import { MakeCallDialog } from "@/components/dashboard/MakeCallDialog";
import { AssistantsWidget } from "@/components/dashboard/AssistantsWidget";
import { PhoneNumbersWidget } from "@/components/dashboard/PhoneNumbersWidget";
import { AccountOverviewWidget } from "@/components/dashboard/AccountOverviewWidget";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Activity, Phone, Settings } from "lucide-react";

const Index = () => {
  const { role } = useUserRole();
  const [filters, setFilters] = useState<CallFilterOptions>({
    dateRange: "all",
    customStartDate: undefined,
    customEndDate: undefined,
    category: undefined,
    status: undefined,
    type: undefined,
  });
  
  // Fetch Vapi analytics and calls with auto-refresh every 60 seconds
  const { analytics: allAnalytics, loading: analyticsLoading, refresh: refreshAnalytics, lastUpdated, allCalls } = useVapiAnalytics({
    autoRefresh: true,
    refreshInterval: 60000,
  });
  
  // Get filtered calls
  const { filteredCalls, totalCalls, filteredCount } = useFilteredCalls(allCalls, filters);
  
  // Calculate analytics for filtered calls
  const { analytics: filteredAnalytics } = useVapiAnalytics({
    calls: filteredCalls,
  });
  
  // Use filtered analytics if filters are active, otherwise use all analytics
  const hasActiveFilters = filters.dateRange !== "all" || filters.category || filters.status || filters.type;
  const analytics = hasActiveFilters ? filteredAnalytics : allAnalytics;

  // Define what each role can see
  const canSeeAdvancedMetrics = role === "owner" || role === "admin" || role === "manager";
  const canSeeCallLogs = role !== "viewer";

  const handleRefresh = () => {
    refreshAnalytics();
  };

  const isLoading = analyticsLoading;

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8 max-w-[1800px] mx-auto dashboard-content bg-background min-h-screen">
          {/* Header */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
                  VOICE AI Dashboard
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Real-time AI voice assistant analytics and call management
                </p>
              </div>
              <MakeCallDialog />
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
              {isLoading && allCalls.length === 0 ? (
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
                  {/* Real-Time Call Monitor */}
                  <RealTimeCallMonitor calls={allCalls} onRefresh={handleRefresh} />

                  {/* Filters */}
                  <CallFilters filters={filters} onFiltersChange={setFilters} />
                  {filteredCount < totalCalls && (
                    <div className="text-sm text-muted-foreground">
                      Showing {filteredCount} of {totalCalls} calls
                    </div>
                  )}

                  {/* Tabs for different views */}
                  <Tabs defaultValue="overview" className="space-y-6">
                    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                      <TabsList className="bg-muted/50 p-1 inline-flex min-w-full sm:min-w-0">
                        <TabsTrigger value="overview" className="flex items-center gap-2 text-xs sm:text-sm whitespace-nowrap">
                          <BarChart3 className="w-4 h-4" />
                          <span className="hidden sm:inline">Overview</span>
                          <span className="sm:hidden">Home</span>
                        </TabsTrigger>
                        <TabsTrigger value="analytics" className="flex items-center gap-2 text-xs sm:text-sm whitespace-nowrap">
                          <Activity className="w-4 h-4" />
                          <span className="hidden sm:inline">Detailed Analytics</span>
                          <span className="sm:hidden">Analytics</span>
                        </TabsTrigger>
                        {canSeeCallLogs && (
                          <TabsTrigger value="calls" className="flex items-center gap-2 text-xs sm:text-sm whitespace-nowrap">
                            <Phone className="w-4 h-4" />
                            <span className="hidden sm:inline">Call Logs</span>
                            <span className="sm:hidden">Calls</span>
                          </TabsTrigger>
                        )}
                        <TabsTrigger value="account" className="flex items-center gap-2 text-xs sm:text-sm whitespace-nowrap">
                          <Settings className="w-4 h-4" />
                          <span className="hidden sm:inline">Account & Resources</span>
                          <span className="sm:hidden">Account</span>
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent value="overview" className="space-y-6 sm:space-y-8">
                      {/* Metrics Grid */}
                      <VapiMetricsGrid analytics={analytics} loading={false} />

                      {/* Cost Breakdown */}
                      <CostBreakdownWidget analytics={analytics} />

                      {/* Charts */}
                      <CallStatisticsChart analytics={analytics} />

                      {/* Performance Trends */}
                      <PerformanceTrendsChart />
                    </TabsContent>

                    <TabsContent value="analytics" className="space-y-6 sm:space-y-8">
                      <DetailedAnalytics calls={filteredCalls} />
                    </TabsContent>

                    {canSeeCallLogs && (
                      <TabsContent value="calls" className="space-y-6 sm:space-y-8">
                        <VapiCallLogsTable calls={filteredCalls} loading={false} />
                      </TabsContent>
                    )}

                    <TabsContent value="account" className="space-y-6 sm:space-y-8">
                      {/* Account Overview */}
                      <AccountOverviewWidget analytics={allAnalytics} />
                      
                      {/* Resources Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        <AssistantsWidget />
                        <PhoneNumbersWidget />
                      </div>
                    </TabsContent>
                  </Tabs>
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
