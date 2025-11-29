import ProfessionalCallTable from "@/components/dashboard/ProfessionalCallTable";
import { DateRange } from "react-day-picker";

interface CallLogsWidgetProps {
  dateRange?: DateRange;
  canSeeCallLogs: boolean;
}

export const CallLogsWidget = ({ dateRange, canSeeCallLogs }: CallLogsWidgetProps) => {
  if (!canSeeCallLogs) {
    return (
      <div className="w-full bg-card border border-border rounded-lg p-8 flex items-center justify-center">
        <div className="text-center space-y-2 p-8 border border-border rounded-md bg-muted">
          <p className="text-sm font-medium text-foreground">
            Access Restricted
          </p>
          <p className="text-xs text-muted-foreground">
            Contact administrator for call log access
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-card border border-border rounded-lg p-6">
      <ProfessionalCallTable dateRange={dateRange} />
    </div>
  );
};
