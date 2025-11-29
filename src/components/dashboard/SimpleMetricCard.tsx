import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface SimpleMetricCardProps {
  title: string;
  value: string;
  change?: string;
  icon: LucideIcon;
  trend?: "up" | "down";
  subtitle?: string;
}

const SimpleMetricCard = ({ title, value, change, icon: Icon, trend, subtitle }: SimpleMetricCardProps) => {
  const getTrendColor = () => {
    if (!trend) return "text-muted-foreground";
    return trend === "up" ? "text-success" : "text-muted-foreground";
  };

  const getIconBackground = () => {
    if (title.includes("Success") || title.includes("Conversion")) {
      return "bg-success/10 text-success";
    }
    if (title.includes("Duration") || title.includes("Time")) {
      return "bg-muted text-muted-foreground";
    }
    if (title.includes("Forward")) {
      return "bg-primary/10 text-primary";
    }
    return "bg-muted text-foreground";
  };

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 border-border bg-card">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-xl ${getIconBackground()} transition-transform duration-300 group-hover:scale-110`}>
            <Icon className="w-5 h-5" />
          </div>
          {change && (
            <span className={`text-sm font-semibold ${getTrendColor()}`}>
              {change}
            </span>
          )}
        </div>
        
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            {title}
          </p>
          <p className="text-3xl font-bold text-foreground tracking-tight">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SimpleMetricCard;