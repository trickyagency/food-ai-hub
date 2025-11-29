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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="bg-card border border-border/60 shadow-elegant hover:shadow-lg transition-all duration-300 group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-11 h-11 rounded-lg ${stat.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{stat.title}</p>
                <p className="text-3xl font-bold text-foreground mb-2">{stat.value}</p>
                <p className={`text-xs font-semibold ${stat.change.startsWith('+') ? 'text-success' : 'text-destructive'}`}>
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Chart */}
      <Card className="bg-card border border-border/60 shadow-elegant hover:shadow-lg transition-all duration-300">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-primary" />
              </div>
              Order Distribution
            </CardTitle>
            {dateRange?.from && dateRange?.to && (
              <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary gap-1.5 font-semibold">
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
