import OrderMetrics from "@/components/dashboard/OrderMetrics";
import { DateRange } from "react-day-picker";

interface OrderMetricsWidgetProps {
  dateRange?: DateRange;
}

export const OrderMetricsWidget = ({ dateRange }: OrderMetricsWidgetProps) => {
  return (
    <div className="p-6 h-full overflow-auto">
      <OrderMetrics dateRange={dateRange} />
    </div>
  );
};
