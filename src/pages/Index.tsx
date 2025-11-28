import DashboardLayout from "@/components/DashboardLayout";
import MetricCard from "@/components/MetricCard";
import CallLogTable from "@/components/CallLogTable";
import { ProtectedFeature } from "@/components/ProtectedFeature";
import { Phone, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent } from "@/components/ui/card";

const Index = () => {
  const { role } = useUserRole();

  // Define what each role can see
  const canSeeAdvancedMetrics = role === "owner" || role === "admin" || role === "manager";
  const canSeeCallLogs = role !== "viewer"; // Viewers have most limited access

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Monitor your AI calling agent performance</p>
          {role && (
            <p className="text-sm text-muted-foreground capitalize">
              Role: <span className="font-medium">{role}</span>
            </p>
          )}
        </div>

        {/* Metrics Grid - Different views based on role */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Basic Metrics - All users can see */}
          <MetricCard
            title="Total Calls"
            value="1,247"
            change="+12.5% from last week"
            icon={Phone}
            trend="up"
          />
          <MetricCard
            title="Success Rate"
            value="94.2%"
            change="+2.4% from last week"
            icon={CheckCircle2}
            trend="up"
          />
          
          {/* Advanced Metrics - Manager, Admin, Owner only */}
          {canSeeAdvancedMetrics ? (
            <>
              <MetricCard
                title="Avg. Duration"
                value="3m 24s"
                change="-0.8% from last week"
                icon={Clock}
                trend="down"
              />
              <MetricCard
                title="Conversion"
                value="67.8%"
                change="+5.1% from last week"
                icon={TrendingUp}
                trend="up"
              />
            </>
          ) : (
            <>
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground text-center">
                    Contact admin for access
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground text-center">
                    Contact admin for access
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Call Logs - Restricted for viewers */}
        {canSeeCallLogs ? (
          <CallLogTable />
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
