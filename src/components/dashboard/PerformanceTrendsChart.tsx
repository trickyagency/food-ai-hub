import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useVapiCalls } from "@/hooks/useVapiCalls";
import { useMemo } from "react";
import { format, subDays, startOfDay } from "date-fns";

const PerformanceTrendsChart = () => {
  const { calls } = useVapiCalls();

  const trendData = useMemo(() => {
    // Generate last 7 days
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(startOfDay(new Date()), 6 - i);
      return {
        date: format(date, "MMM d"),
        fullDate: date,
        calls: 0,
        minutes: 0,
        cost: 0,
      };
    });

    // Aggregate call data by day
    calls.forEach((call) => {
      if (!call.createdAt) return;
      
      const callDate = startOfDay(new Date(call.createdAt));
      const dayIndex = days.findIndex(d => d.fullDate.getTime() === callDate.getTime());
      
      if (dayIndex !== -1) {
        days[dayIndex].calls += 1;
        days[dayIndex].minutes += Math.round((call.duration || 0) / 60);
        days[dayIndex].cost += call.cost || 0;
      }
    });

    // Round cost to 2 decimal places
    return days.map(day => ({
      date: day.date,
      calls: day.calls,
      minutes: day.minutes,
      cost: Math.round(day.cost * 100) / 100,
    }));
  }, [calls]);

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Performance Trends (Last 7 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={trendData}>
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
