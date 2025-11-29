import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, CheckCircle2, XCircle, AlertTriangle, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";

interface OrderMetricsProps {
  dateRange?: DateRange;
}

const OrderMetrics = ({ dateRange }: OrderMetricsProps) => {
  const orderData = [
    { name: "Total Orders", value: 2847, color: "hsl(var(--primary))" },
    { name: "Processed", value: 2643, color: "hsl(var(--success))" },
    { name: "Failed", value: 158, color: "hsl(var(--destructive))" },
    { name: "Issues", value: 46, color: "hsl(var(--warning))" },
  ];

  const stats = [
    { 
      title: "Total Orders", 
      value: "2,847", 
      change: "+15.3% from last month",
      icon: ShoppingCart, 
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    { 
      title: "Processed Orders", 
      value: "2,643", 
      change: "+12.8% from last month",
      icon: CheckCircle2, 
      color: "text-success",
      bgColor: "bg-success/10"
    },
    { 
      title: "Failed Orders", 
      value: "158", 
      change: "-2.1% from last month",
      icon: XCircle, 
      color: "text-destructive",
      bgColor: "bg-destructive/10"
    },
    { 
      title: "Order Issues", 
      value: "46", 
      change: "-5.4% from last month",
      icon: AlertTriangle, 
      color: "text-warning",
      bgColor: "bg-warning/10"
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="bg-gradient-card border-border/50 shadow-elegant hover:shadow-glow transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-sm font-medium text-muted-foreground mb-2">{stat.title}</p>
                <p className="text-3xl font-bold text-foreground mb-2">{stat.value}</p>
                <p className={`text-sm font-medium ${stat.change.startsWith('+') ? 'text-success' : 'text-destructive'}`}>
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Chart */}
      <Card className="bg-gradient-card border-border/50 shadow-elegant">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-foreground flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Order Distribution
            </CardTitle>
            {dateRange?.from && dateRange?.to && (
              <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary gap-1.5">
                <Calendar className="w-3 h-3" />
                <span className="text-xs">
                  {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd, yyyy")}
                </span>
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={orderData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem"
                }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {orderData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderMetrics;
