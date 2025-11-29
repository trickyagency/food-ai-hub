import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VapiAnalytics } from "@/hooks/useVapiAnalytics";
import { DollarSign } from "lucide-react";

interface CostBreakdownWidgetProps {
  analytics: VapiAnalytics;
}

const CostBreakdownWidget = ({ analytics }: CostBreakdownWidgetProps) => {
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

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          Cost Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {costItems.map((item) => (
            <div
              key={item.label}
              className={`${item.lightBg} rounded-xl p-4 space-y-2 border border-border/30`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${item.color}`} />
                <p className="text-xs font-medium text-muted-foreground">
                  {item.label}
                </p>
              </div>
              <p className={`text-2xl font-bold ${item.textColor}`}>
                ${item.value.toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CostBreakdownWidget;
