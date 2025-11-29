import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const PerformanceTrendsChart = () => {
  // Mock data for trends - in real implementation, this would come from Vapi API
  const data = [
    { date: "Jan 1", calls: 45, minutes: 120, cost: 24 },
    { date: "Jan 2", calls: 52, minutes: 145, cost: 29 },
    { date: "Jan 3", calls: 48, minutes: 132, cost: 26 },
    { date: "Jan 4", calls: 61, minutes: 168, cost: 34 },
    { date: "Jan 5", calls: 55, minutes: 151, cost: 30 },
    { date: "Jan 6", calls: 67, minutes: 185, cost: 37 },
    { date: "Jan 7", calls: 72, minutes: 198, cost: 40 },
  ];

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Performance Trends (Last 7 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend
              wrapperStyle={{
                fontSize: "12px",
              }}
            />
            <Bar dataKey="calls" fill="#2E6FFF" name="Calls" radius={[8, 8, 0, 0]} />
            <Bar dataKey="minutes" fill="#8B5CF6" name="Minutes" radius={[8, 8, 0, 0]} />
            <Bar dataKey="cost" fill="#10B981" name="Cost ($)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default PerformanceTrendsChart;
