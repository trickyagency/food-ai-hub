import DashboardLayout from "@/components/DashboardLayout";
import MetricCard from "@/components/MetricCard";
import CallLogTable from "@/components/CallLogTable";
import { Phone, TrendingUp, Clock, CheckCircle2 } from "lucide-react";

const Index = () => {
  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Monitor your AI calling agent performance</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
        </div>

        {/* Call Logs */}
        <CallLogTable />
      </div>
    </DashboardLayout>
  );
};

export default Index;
