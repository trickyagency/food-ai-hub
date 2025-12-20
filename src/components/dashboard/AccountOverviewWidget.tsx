import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Phone, Bot, Clock } from "lucide-react";
import { VapiAnalytics } from "@/hooks/useVapiAnalytics";
import { getDurationBreakdown } from "@/lib/utils";

interface AccountOverviewWidgetProps {
  analytics: VapiAnalytics;
}

export const AccountOverviewWidget = ({ analytics }: AccountOverviewWidgetProps) => {
  const duration = getDurationBreakdown(analytics.totalMinutes);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          Account Overview
        </CardTitle>
        <CardDescription>Your VOICE AI SmartFlow account summary</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Phone className="w-4 h-4" />
              Total Calls
            </div>
            <p className="text-2xl font-bold">{analytics.totalCalls}</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Clock className="w-4 h-4" />
              Total Duration
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-baseline gap-1 cursor-help">
                    <span className="text-2xl font-bold">{duration.hours}</span>
                    <span className="text-xs text-muted-foreground">h</span>
                    <span className="text-2xl font-bold ml-1">{duration.minutes}</span>
                    <span className="text-xs text-muted-foreground">m</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{duration.hours}h {duration.minutes}m {duration.seconds}s</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Bot className="w-4 h-4" />
              Success Rate
            </div>
            <p className="text-2xl font-bold">{analytics.successRate.toFixed(1)}%</p>
          </div>
        </div>
        
        <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
          <p>💡 View your real-time analytics and call performance in the dashboard.</p>
        </div>
      </CardContent>
    </Card>
  );
};