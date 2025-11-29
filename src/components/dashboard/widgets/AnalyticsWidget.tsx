import AdvancedAnalytics from "@/components/dashboard/AdvancedAnalytics";
import { DateRange } from "react-day-picker";

interface AnalyticsWidgetProps {
  dateRange?: DateRange;
}

export const AnalyticsWidget = ({ dateRange }: AnalyticsWidgetProps) => {
  return (
    <div className="p-6 h-full overflow-auto">
      <AdvancedAnalytics dateRange={dateRange} />
    </div>
  );
};
