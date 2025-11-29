import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface VapiConnectionStatusProps {
  onRefresh: () => void;
  lastUpdated: Date | null;
  isRefreshing?: boolean;
}

const VapiConnectionStatus = ({ onRefresh, lastUpdated, isRefreshing }: VapiConnectionStatusProps) => {
  return (
    <div className="flex items-center gap-4 p-4 bg-card border border-border/50 rounded-lg shadow-sm">
      <Badge variant="default" className="gap-2 bg-green-500 hover:bg-green-600">
        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
        Connected to Vapi
      </Badge>
      
      {lastUpdated && (
        <span className="text-sm text-muted-foreground">
          Last updated: {format(lastUpdated, "h:mm:ss a")}
        </span>
      )}
      
      <Button
        onClick={onRefresh}
        disabled={isRefreshing}
        size="sm"
        variant="outline"
        className="ml-auto"
      >
        <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
        {isRefreshing ? "Refreshing..." : "Refresh"}
      </Button>
    </div>
  );
};

export default VapiConnectionStatus;
