import { CombinedChart } from "@/components/dashboard/SimpleCharts";
import { DateRange } from "react-day-picker";

interface AnalyticsWidgetProps {
  dateRange?: DateRange;
}

export const AnalyticsWidget = ({ dateRange }: AnalyticsWidgetProps) => {
  return (
    <div className="p-6 h-full overflow-auto">
      <CombinedChart dateRange={dateRange} />
    </div>
  );
};
