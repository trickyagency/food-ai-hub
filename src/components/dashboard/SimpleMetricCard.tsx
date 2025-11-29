import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { ArrowUp, ArrowDown } from "lucide-react";

interface SimpleMetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: LucideIcon;
  trend?: "up" | "down";
  subtitle?: string;
}

const SimpleMetricCard = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  trend,
  subtitle
}: SimpleMetricCardProps) => {
  
  // Professional muted colors based on metric type
  const getTrendColor = () => {
    if (!trend) return "text-muted-foreground";
    return trend === "up" ? "text-emerald-600 dark:text-emerald-500" : "text-slate-600 dark:text-slate-400";
  };

  const getIconBackground = () => {
    if (title.includes("Success") || title.includes("Conversion")) {
      return "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400";
    }
    if (title.includes("Duration") || title.includes("Time")) {
      return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400";
    }
    if (title.includes("Forward")) {
      return "bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400";
    }
    return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300";
  };

  return (
    <Card className="group hover:shadow-md transition-all duration-200 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getIconBackground()}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {value}
            </p>
          </div>
          
          {change && (
            <div className={`flex items-center gap-1 text-sm font-medium ${getTrendColor()}`}>
              {trend === "up" && <ArrowUp className="w-4 h-4" />}
              {trend === "down" && <ArrowDown className="w-4 h-4" />}
              <span>{change}</span>
            </div>
          )}
          
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
              {subtitle}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SimpleMetricCard;
