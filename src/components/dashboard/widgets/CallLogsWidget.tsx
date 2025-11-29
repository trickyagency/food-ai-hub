import ProfessionalCallTable from "@/components/dashboard/ProfessionalCallTable";
import { DateRange } from "react-day-picker";

interface CallLogsWidgetProps {
  dateRange?: DateRange;
  canSeeCallLogs: boolean;
}

export const CallLogsWidget = ({ dateRange, canSeeCallLogs }: CallLogsWidgetProps) => {
  if (!canSeeCallLogs) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center space-y-2 p-8 border border-slate-200 dark:border-slate-800 rounded-md bg-slate-50 dark:bg-slate-900/50">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Access Restricted
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Contact administrator for call log access
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <ProfessionalCallTable dateRange={dateRange} />
    </div>
  );
};
