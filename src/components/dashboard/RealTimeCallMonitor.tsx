import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VapiCall } from "@/hooks/useVapiCalls";
import { Phone, Clock, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface RealTimeCallMonitorProps {
  calls: VapiCall[];
  onRefresh: () => void;
}

const RealTimeCallMonitor = ({ calls, onRefresh }: RealTimeCallMonitorProps) => {
  const [activeCalls, setActiveCalls] = useState<VapiCall[]>([]);

  useEffect(() => {
    // Filter for active/ongoing calls
    const active = calls.filter(
      (call) => call.status === "in-progress" || call.status === "ringing" || call.status === "queued"
    );
    setActiveCalls(active);

    // Auto-refresh every 10 seconds when there are active calls
    if (active.length > 0) {
      const interval = setInterval(() => {
        onRefresh();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [calls, onRefresh]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      "in-progress": "bg-green-500 animate-pulse",
      ringing: "bg-yellow-500 animate-pulse",
      queued: "bg-blue-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      "in-progress": "In Progress",
      ringing: "Ringing",
      queued: "Queued",
    };
    return labels[status] || status;
  };

  if (activeCalls.length === 0) {
    return (
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Live Call Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Phone className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No Active Calls</p>
            <p className="text-xs text-muted-foreground mt-1">
              Active calls will appear here in real-time
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Live Call Monitor
          </CardTitle>
          <Badge variant="default" className="gap-2 bg-green-500 hover:bg-green-600">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            {activeCalls.length} Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activeCalls.map((call) => (
            <div
              key={call.id}
              className="p-4 bg-muted/50 rounded-lg border border-border/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(call.status)}`} />
                    <Badge variant="outline" className="text-xs">
                      {getStatusLabel(call.status)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {call.type === "inboundPhoneCall"
                        ? "Inbound"
                        : call.type === "outboundPhoneCall"
                        ? "Outbound"
                        : "Web"}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      {call.customer?.number || call.phoneNumber?.number || "Unknown"}
                    </p>
                    {call.customer?.name && (
                      <p className="text-xs text-muted-foreground">{call.customer.name}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(call.createdAt), { addSuffix: true })}
                    </div>
                    {call.duration && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {Math.floor(call.duration / 60)}m {call.duration % 60}s
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Phone className="w-6 h-6 text-primary animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
          <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Auto-refreshing every 10 seconds while calls are active
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default RealTimeCallMonitor;
