import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { VapiAnalytics } from "@/hooks/useVapiAnalytics";
import { DollarSign, Radio } from "lucide-react";

interface CostBreakdownWidgetProps {
  analytics: VapiAnalytics;
}

const CostBreakdownWidget = ({ analytics }: CostBreakdownWidgetProps) => {
  const totalCost = analytics.totalCost || 0;
  
  const costItems = [
    {
      label: "Speech-to-Text",
      value: analytics.costBreakdown.stt,
      color: "bg-blue-500",
      lightBg: "bg-blue-100 dark:bg-blue-950/30",
      textColor: "text-blue-700 dark:text-blue-300",
    },
    {
      label: "LLM",
      value: analytics.costBreakdown.llm,
      color: "bg-purple-500",
      lightBg: "bg-purple-100 dark:bg-purple-950/30",
      textColor: "text-purple-700 dark:text-purple-300",
    },
    {
      label: "Text-to-Speech",
      value: analytics.costBreakdown.tts,
      color: "bg-green-500",
      lightBg: "bg-green-100 dark:bg-green-950/30",
      textColor: "text-green-700 dark:text-green-300",
    },
    {
      label: "Vapi Platform",
      value: analytics.costBreakdown.vapi,
      color: "bg-orange-500",
      lightBg: "bg-orange-100 dark:bg-orange-950/30",
      textColor: "text-orange-700 dark:text-orange-300",
    },
    {
      label: "Transport",
      value: analytics.costBreakdown.transport,
      color: "bg-pink-500",
      lightBg: "bg-pink-100 dark:bg-pink-950/30",
      textColor: "text-pink-700 dark:text-pink-300",
    },
  ];

  const getPercentage = (value: number) => {
    if (totalCost === 0) return 0;
    return (value / totalCost) * 100;
  };

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base sm:text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            Cost Breakdown
          </span>
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-xs font-medium">
            <Radio className="w-3 h-3 animate-pulse" />
            Live
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Cost Header */}
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
          <p className="text-sm text-muted-foreground mb-1">Total Cost</p>
          <p className="text-3xl font-bold text-primary">${totalCost.toFixed(2)}</p>
        </div>

        {/* Cost Items Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {costItems.map((item) => {
            const percentage = getPercentage(item.value);
            return (
              <div
                key={item.label}
                className={`${item.lightBg} rounded-xl p-3 sm:p-4 space-y-2 border border-border/30 touch-manipulation active:scale-95 transition-transform`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${item.color}`} />
                  <p className="text-xs font-medium text-muted-foreground truncate">
                    {item.label}
                  </p>
                </div>
                <p className={`text-xl sm:text-2xl font-bold ${item.textColor}`}>
                  ${item.value.toFixed(2)}
                </p>
                <div className="space-y-1">
                  <Progress value={percentage} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default CostBreakdownWidget;
