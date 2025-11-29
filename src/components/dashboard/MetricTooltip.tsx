import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface MetricTooltipProps {
  title: string;
  currentValue: string | number;
  previousValue: string | number;
  change: string;
  trend: "up" | "down" | undefined;
  historicalData: Array<{ value: number }>;
}

const MetricTooltip = ({ 
  title, 
  currentValue, 
  previousValue, 
  change, 
  trend,
  historicalData 
}: MetricTooltipProps) => {
  return (
    <Card className="w-72 bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            {title}
          </p>
          <p className="text-2xl font-bold text-foreground">
            {currentValue}
          </p>
        </div>

        {/* Trend Indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {trend === "up" ? (
              <TrendingUp className="w-4 h-4 text-success" />
            ) : (
              <TrendingDown className="w-4 h-4 text-destructive" />
            )}
            <span className={`text-sm font-semibold ${
              trend === "up" ? "text-success" : "text-destructive"
            }`}>
              {change}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            vs {previousValue}
          </span>
        </div>

        {/* Mini Chart */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground">
              Last 7 Days Trend
            </p>
          </div>
          <ResponsiveContainer width="100%" height={60}>
            <LineChart data={historicalData}>
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Peak</p>
            <p className="text-sm font-semibold text-foreground">
              {Math.max(...historicalData.map(d => d.value))}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Average</p>
            <p className="text-sm font-semibold text-foreground">
              {Math.round(historicalData.reduce((a, b) => a + b.value, 0) / historicalData.length)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricTooltip;
