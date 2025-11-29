import { CombinedChart } from "@/components/dashboard/SimpleCharts";
import { DateRange } from "react-day-picker";

interface OrderMetricsWidgetProps {
  dateRange?: DateRange;
}

export const OrderMetricsWidget = ({ dateRange }: OrderMetricsWidgetProps) => {
  return (
    <div className="p-6">
      <CombinedChart dateRange={dateRange} />
    </div>
  );
};
