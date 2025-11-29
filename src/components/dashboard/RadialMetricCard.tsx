import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";
import { ArrowUp, ArrowDown } from "lucide-react";

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
    <Card className="group relative overflow-hidden bg-gradient-card border-border/50 shadow-elegant hover:shadow-glow transition-all duration-500 hover:scale-[1.02]">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <CardContent className="relative p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow duration-300">
            <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          </div>
        </div>

        <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">
          {title}
        </p>
        
        {/* Chart */}
        <div className="relative mb-3 sm:mb-4">
          <ResponsiveContainer width="100%" height={120}>
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="65%"
              outerRadius="100%"
              barSize={10}
              data={data}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar
                background={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                dataKey="value"
                cornerRadius={10}
                animationDuration={1500}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-2xl sm:text-3xl font-bold text-foreground animate-fade-in">
              {value}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {percentage}%
            </p>
          </div>
        </div>

        {/* Change indicator */}
        {change && (
          <div className={`flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-full ${
            trend === "up" 
              ? "bg-success/10 text-success" 
              : "bg-destructive/10 text-destructive"
          }`}>
            {trend === "up" ? (
              <ArrowUp className="w-3 h-3 animate-pulse" />
            ) : (
              <ArrowDown className="w-3 h-3 animate-pulse" />
            )}
            <span>{change}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RadialMetricCard;
