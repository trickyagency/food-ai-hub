import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { DateRange } from "react-day-picker";
import { Activity } from "lucide-react";

// Generate data based on date range
export const generateData = (days: number) => {
  const data = [];
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      calls: Math.floor(80 + Math.random() * 60),
      success: Math.floor(70 + Math.random() * 20),
      orders: Math.floor(200 + Math.random() * 100),
    });
  }
  
  return data;
};

interface SimpleChartsProps {
  dateRange?: DateRange;
}

export const CombinedChart = ({ dateRange }: SimpleChartsProps) => {
  // Calculate days between range or default to 7
  const days = dateRange?.from && dateRange?.to
    ? Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 7;
  
  const data = generateData(Math.min(days, 30)); // Cap at 30 days for performance

  return (
    <Card className="border-border bg-card">
      <CardHeader className="border-b border-border bg-muted/30">
        <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Performance Overview
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Call metrics and order volume trends
        </p>
      </CardHeader>
      <CardContent className="p-6">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickMargin={10}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickMargin={10}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.75rem',
                fontSize: '12px',
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
            />
            <Line 
              type="monotone" 
              dataKey="calls" 
              stroke="#2E6FFF" 
              strokeWidth={2.5}
              dot={{ fill: '#2E6FFF', r: 4 }}
              name="Total Calls"
            />
            <Line 
              type="monotone" 
              dataKey="success" 
              stroke="#10b981" 
              strokeWidth={2.5}
              dot={{ fill: '#10b981', r: 4 }}
              name="Successful Calls"
            />
            <Line 
              type="monotone" 
              dataKey="orders" 
              stroke="#8b5cf6" 
              strokeWidth={2.5}
              dot={{ fill: '#8b5cf6', r: 4 }}
              name="Orders"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};