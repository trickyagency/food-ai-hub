import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DateRange } from "react-day-picker";
import { ShoppingCart, Activity } from "lucide-react";

// Generate data based on date range
const generateData = (days: number) => {
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

export const CallsChart = ({ dateRange }: SimpleChartsProps) => {
  // Calculate days between range or default to 7
  const days = dateRange?.from && dateRange?.to
    ? Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 7;
  
  const data = generateData(Math.min(days, 30)); // Cap at 30 days for performance

  return (
    <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Call Performance
        </CardTitle>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          Daily call volume and success rate
        </p>
      </CardHeader>
      <CardContent className="p-6">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" />
            <XAxis 
              dataKey="date" 
              stroke="#64748b"
              fontSize={12}
              tickMargin={10}
            />
            <YAxis 
              stroke="#64748b"
              fontSize={12}
              tickMargin={10}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '0.375rem',
                fontSize: '12px',
              }}
            />
            <Line 
              type="monotone" 
              dataKey="calls" 
              stroke="#334155" 
              strokeWidth={2}
              dot={{ fill: '#334155', r: 3 }}
              name="Total Calls"
            />
            <Line 
              type="monotone" 
              dataKey="success" 
              stroke="#10b981" 
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 3 }}
              name="Successful"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export const OrdersChart = ({ dateRange }: SimpleChartsProps) => {
  const days = dateRange?.from && dateRange?.to
    ? Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 7;
  
  const data = generateData(Math.min(days, 30));

  return (
    <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          Order Volume
        </CardTitle>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          Daily order processing trends
        </p>
      </CardHeader>
      <CardContent className="p-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" />
            <XAxis 
              dataKey="date" 
              stroke="#64748b"
              fontSize={12}
              tickMargin={10}
            />
            <YAxis 
              stroke="#64748b"
              fontSize={12}
              tickMargin={10}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '0.375rem',
                fontSize: '12px',
              }}
            />
            <Bar 
              dataKey="orders" 
              fill="#334155"
              radius={[4, 4, 0, 0]}
              name="Orders"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
