import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import RadialMetricCard from "@/components/dashboard/RadialMetricCard";
import TimeFilter from "@/components/dashboard/TimeFilter";
import EnhancedCallLogTable from "@/components/dashboard/EnhancedCallLogTable";
import OrderMetrics from "@/components/dashboard/OrderMetrics";
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
  const canSeeCallLogs = role !== "viewer"; // Viewers have most limited access

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Monitor your AI calling agent performance</p>
            {role && (
              <p className="text-sm text-muted-foreground capitalize">
                Role: <span className="font-medium">{role}</span>
              </p>
            )}
          </div>
          {canSeeAdvancedMetrics && (
            <TimeFilter selected={timePeriod} onChange={setTimePeriod} />
          )}
        </div>

        {/* Call Metrics - Radial Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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
        {canSeeAdvancedMetrics && <OrderMetrics />}

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
