import { Clock, CheckCircle2, ChefHat, XCircle, Package, User } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusChange {
  id: string;
  previous_status: string | null;
  new_status: string;
  changed_by_email: string | null;
  created_at: string;
  durationMinutes: number | null;
}

interface OrderStatusTimelineProps {
  history: StatusChange[];
  loading?: boolean;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "confirmed":
      return <Package className="h-4 w-4" />;
    case "preparing":
      return <ChefHat className="h-4 w-4" />;
    case "completed":
      return <CheckCircle2 className="h-4 w-4" />;
    case "cancelled":
      return <XCircle className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "confirmed":
      return "bg-amber-500";
    case "preparing":
      return "bg-blue-500";
    case "completed":
      return "bg-emerald-500";
    case "cancelled":
      return "bg-red-500";
    default:
      return "bg-muted";
  }
};

const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "completed":
      return "default";
    case "cancelled":
      return "destructive";
    case "preparing":
      return "secondary";
    default:
      return "outline";
  }
};

const formatDuration = (minutes: number | null) => {
  if (minutes === null) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

export const OrderStatusTimeline = ({ history, loading }: OrderStatusTimelineProps) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No status history available</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {history.map((change, index) => {
        const isFirst = index === 0;
        const isLast = index === history.length - 1;
        
        return (
          <div key={change.id} className="relative flex gap-4">
            {/* Connector line */}
            {!isLast && (
              <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-border" />
            )}
            
            {/* Status icon */}
            <div 
              className={cn(
                "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white",
                getStatusColor(change.new_status)
              )}
            >
              {getStatusIcon(change.new_status)}
            </div>
            
            {/* Content */}
            <div className={cn("flex-1 pb-6", isLast && "pb-0")}>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={getStatusBadgeVariant(change.new_status)} className="capitalize">
                  {change.new_status}
                </Badge>
                {isFirst && (
                  <Badge variant="outline" className="text-xs">
                    Order Created
                  </Badge>
                )}
              </div>
              
              <div className="mt-1.5 flex flex-col gap-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{format(new Date(change.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  <span>{change.changed_by_email || "System"}</span>
                </div>
              </div>
              
              {/* Duration indicator */}
              {change.durationMinutes !== null && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground/70">
                  <div className="h-px flex-1 bg-border max-w-[40px]" />
                  <span className="italic">{formatDuration(change.durationMinutes)}</span>
                  <div className="h-px flex-1 bg-border max-w-[40px]" />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
