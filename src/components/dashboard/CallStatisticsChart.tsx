import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { VapiAnalytics } from "@/hooks/useVapiAnalytics";

interface CallStatisticsChartProps {
  analytics: VapiAnalytics;
}

const CallStatisticsChart = ({ analytics }: CallStatisticsChartProps) => {
  const statusData = [
    { name: "Completed", value: analytics.callsByStatus.completed, color: "#10B981" },
    { name: "Failed", value: analytics.callsByStatus.failed, color: "#EF4444" },
    { name: "Ongoing", value: analytics.callsByStatus.ongoing, color: "#F59E0B" },
    { name: "Other", value: analytics.callsByStatus.other, color: "#6B7280" },
  ];

  const typeData = [
    { name: "Inbound", value: analytics.callsByType.inbound, color: "#2E6FFF" },
    { name: "Outbound", value: analytics.callsByType.outbound, color: "#8B5CF6" },
    { name: "Web", value: analytics.callsByType.web, color: "#EC4899" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Call Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280} className="sm:h-[300px]">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "14px",
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                wrapperStyle={{ fontSize: "12px" }}
                formatter={(value, entry: any) => (
                  <span className="text-xs sm:text-sm text-foreground">
                    {value}: {entry.payload.value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Call Type Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280} className="sm:h-[300px]">
            <PieChart>
              <Pie
                data={typeData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
              >
                {typeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "14px",
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                wrapperStyle={{ fontSize: "12px" }}
                formatter={(value, entry: any) => (
                  <span className="text-xs sm:text-sm text-foreground">
                    {value}: {entry.payload.value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default CallStatisticsChart;
