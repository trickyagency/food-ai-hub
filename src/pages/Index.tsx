import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import RadialMetricCard from "@/components/dashboard/RadialMetricCard";
import TimeFilter from "@/components/dashboard/TimeFilter";
import EnhancedCallLogTable from "@/components/dashboard/EnhancedCallLogTable";
import OrderMetrics from "@/components/dashboard/OrderMetrics";
import AdvancedAnalytics from "@/components/dashboard/AdvancedAnalytics";
import { ProtectedFeature } from "@/components/ProtectedFeature";
import { Phone, TrendingUp, Clock, CheckCircle2, PhoneForwarded } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent } from "@/components/ui/card";

type TimePeriod = "hours" | "days" | "weeks" | "months" | "years";

const Index = () => {
  const { role } = useUserRole();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("days");

  // Define what each role can see
  const canSeeAdvancedMetrics = role === "owner" || role === "admin" || role === "manager";
  const canSeeCallLogs = role !== "viewer";

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6">
          <div className="space-y-1 lg:space-y-2">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text">
              Dashboard
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Monitor your AI calling agent performance in real-time
            </p>
            {role && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <p className="text-xs sm:text-sm font-medium capitalize text-primary">
                  {role}
                </p>
              </div>
            )}
          </div>
          {canSeeAdvancedMetrics && (
            <TimeFilter selected={timePeriod} onChange={setTimePeriod} />
          )}
        </div>

        {/* Call Metrics - Radial Charts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-6">
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
              <Card className="col-span-1">
                <CardContent className="p-6 flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground text-center">
                    Contact admin for access
                  </p>
                </CardContent>
              </Card>
              <Card className="col-span-1">
                <CardContent className="p-6 flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground text-center">
                    Contact admin for access
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Order Metrics */}
        {canSeeAdvancedMetrics && (
          <div className="animate-fade-in" style={{ animationDelay: "200ms" }}>
            <OrderMetrics />
          </div>
        )}

        {/* Advanced Analytics */}
        {canSeeAdvancedMetrics && (
          <div className="animate-fade-in" style={{ animationDelay: "300ms" }}>
            <AdvancedAnalytics />
          </div>
        )}

        {/* Recent Calls - Enhanced with Conversation Viewer */}
        {canSeeCallLogs ? (
          <EnhancedCallLogTable />
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">
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
    </DashboardLayout>
  );
};

export default Index;
