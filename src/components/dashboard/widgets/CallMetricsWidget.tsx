import RadialMetricCard from "@/components/dashboard/RadialMetricCard";
import { Phone, TrendingUp, Clock, CheckCircle2, PhoneForwarded } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface CallMetricsWidgetProps {
  canSeeAdvancedMetrics: boolean;
}

export const CallMetricsWidget = ({ canSeeAdvancedMetrics }: CallMetricsWidgetProps) => {
  return (
    <div className="p-6 h-full overflow-auto">
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
    </div>
  );
};
