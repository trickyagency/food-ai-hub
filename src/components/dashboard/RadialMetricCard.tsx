import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";

interface RadialMetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: LucideIcon;
  percentage: number;
  trend?: "up" | "down";
  color?: string;
}

const RadialMetricCard = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  percentage, 
  trend,
  color = "hsl(var(--primary))"
}: RadialMetricCardProps) => {
  const data = [
    {
      name: title,
      value: percentage,
      fill: color,
    }
  ];

  return (
    <Card className="bg-gradient-card border-border/50 shadow-elegant hover:shadow-glow transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
        </div>
        
        <div className="relative">
          <ResponsiveContainer width="100%" height={140}>
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="70%"
              outerRadius="100%"
              barSize={12}
              data={data}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar
                background={{ fill: "hsl(var(--muted))" }}
                dataKey="value"
                cornerRadius={10}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-3xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{percentage}%</p>
          </div>
        </div>

        {change && (
          <p className={`text-sm font-medium mt-4 text-center ${trend === "up" ? "text-success" : "text-destructive"}`}>
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default RadialMetricCard;
