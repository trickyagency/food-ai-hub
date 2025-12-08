import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, DollarSign, Phone, Bot, Clock } from "lucide-react";
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
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Account Overview
          </span>
          <Button variant="outline" size="sm" asChild>
            <a href="https://dashboard.vapi.ai" target="_blank" rel="noopener noreferrer" className="gap-2">
              View in Vapi
              <ExternalLink className="w-3 h-3" />
            </a>
          </Button>
        </CardTitle>
        <CardDescription>Your Vapi account summary</CardDescription>
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
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{duration.hours}</span>
              <span className="text-xs text-muted-foreground">h</span>
              <span className="text-2xl font-bold ml-1">{duration.minutes}</span>
              <span className="text-xs text-muted-foreground">m</span>
              <span className="text-2xl font-bold ml-1">{duration.seconds}</span>
              <span className="text-xs text-muted-foreground">s</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <DollarSign className="w-4 h-4" />
              Total Cost
            </div>
            <p className="text-2xl font-bold">${analytics.totalCost.toFixed(2)}</p>
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
          <p>💡 To view your account balance and credits, visit the Vapi dashboard.</p>
        </div>
      </CardContent>
    </Card>
  );
};
