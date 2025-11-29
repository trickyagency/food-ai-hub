import SimpleMetricCard from "@/components/dashboard/SimpleMetricCard";
import { Phone, TrendingUp, Clock, CheckCircle2, PhoneForwarded } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface CallMetricsWidgetProps {
  canSeeAdvancedMetrics: boolean;
}

export const CallMetricsWidget = ({ canSeeAdvancedMetrics }: CallMetricsWidgetProps) => {
  return (
    <div className="p-6 h-full overflow-auto bg-slate-50 dark:bg-slate-950">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <SimpleMetricCard
          title="Total Calls"
          value="1,247"
          change="+12.5%"
          icon={Phone}
          trend="up"
          subtitle="vs. last period"
        />
        <SimpleMetricCard
          title="Forwarded"
          value="342"
          change="+8.2%"
          icon={PhoneForwarded}
          trend="up"
          subtitle="calls redirected"
        />
        <SimpleMetricCard
          title="Success Rate"
          value="94.2%"
          change="+2.4%"
          icon={CheckCircle2}
          trend="up"
          subtitle="completion rate"
        />
        
        {canSeeAdvancedMetrics ? (
          <>
            <SimpleMetricCard
              title="Avg. Duration"
              value="3m 24s"
              change="-0.8%"
              icon={Clock}
              trend="down"
              subtitle="call length"
            />
            <SimpleMetricCard
              title="Conversion"
              value="67.8%"
              change="+5.1%"
              icon={TrendingUp}
              trend="up"
              subtitle="order conversion"
            />
          </>
        ) : (
          <>
            <Card className="col-span-1 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="p-6 flex items-center justify-center h-full">
                <p className="text-sm text-slate-600 dark:text-slate-400 text-center font-medium">
                  Contact admin for access
                </p>
              </CardContent>
            </Card>
            <Card className="col-span-1 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="p-6 flex items-center justify-center h-full">
                <p className="text-sm text-slate-600 dark:text-slate-400 text-center font-medium">
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
