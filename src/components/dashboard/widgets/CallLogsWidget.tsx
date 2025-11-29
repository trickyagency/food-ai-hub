import EnhancedCallLogTable from "@/components/dashboard/EnhancedCallLogTable";
import { Card, CardContent } from "@/components/ui/card";
import { DateRange } from "react-day-picker";

interface CallLogsWidgetProps {
  dateRange?: DateRange;
  canSeeCallLogs: boolean;
}

export const CallLogsWidget = ({ dateRange, canSeeCallLogs }: CallLogsWidgetProps) => {
  if (!canSeeCallLogs) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <Card className="bg-muted/30 border-dashed w-full">
          <CardContent className="py-12">
            <div className="text-center space-y-2">
              <p className="text-base font-medium text-muted-foreground">
                You don't have permission to view call logs
              </p>
              <p className="text-sm text-muted-foreground">
                Contact your administrator for access
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-auto">
      <EnhancedCallLogTable dateRange={dateRange} />
    </div>
  );
};
