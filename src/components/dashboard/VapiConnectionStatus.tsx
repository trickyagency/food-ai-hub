import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Database } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { invokeWithRetry } from "@/lib/supabaseHelpers";

interface VapiConnectionStatusProps {
  onRefresh: () => void;
  lastUpdated: Date | null;
  isRefreshing?: boolean;
}

const VapiConnectionStatus = ({ onRefresh, lastUpdated, isRefreshing }: VapiConnectionStatusProps) => {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      const { error } = await invokeWithRetry('vapi-sync');
      if (error) throw error;
      toast.success("Sync completed - call durations recalculated");
      onRefresh();
    } catch (error) {
      console.error("Sync failed:", error);
      toast.error("Sync failed. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-card border border-border/50 rounded-lg shadow-sm">
      <Badge variant="default" className="gap-2 bg-green-500 hover:bg-green-600">
        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
        System Connected
      </Badge>
      
      {lastUpdated && (
        <span className="text-sm text-muted-foreground">
          Last updated: {format(lastUpdated, "h:mm:ss a")}
        </span>
      )}
      
      <div className="flex items-center gap-2 ml-auto">
        <Button
          onClick={handleForceSync}
          disabled={isSyncing || isRefreshing}
          size="sm"
          variant="outline"
        >
          <Database className={`w-4 h-4 mr-2 ${isSyncing ? "animate-pulse" : ""}`} />
          {isSyncing ? "Syncing..." : "Force Sync"}
        </Button>
        <Button
          onClick={onRefresh}
          disabled={isRefreshing || isSyncing}
          size="sm"
          variant="outline"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>
    </div>
  );
};

export default VapiConnectionStatus;
