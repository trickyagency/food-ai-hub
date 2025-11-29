import { CombinedChart } from "@/components/dashboard/SimpleCharts";
import { DateRange } from "react-day-picker";

interface AnalyticsWidgetProps {
  dateRange?: DateRange;
}

export const AnalyticsWidget = ({ dateRange }: AnalyticsWidgetProps) => {
  return (
    <div className="w-full bg-card border border-border rounded-lg p-6">
      <CombinedChart dateRange={dateRange} />
    </div>
  );
};
