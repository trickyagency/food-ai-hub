import { useState } from "react";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import { WidgetWrapper } from "./WidgetWrapper";
import { CallMetricsWidget } from "./widgets/CallMetricsWidget";
import { OrderMetricsWidget } from "./widgets/OrderMetricsWidget";
import { AnalyticsWidget } from "./widgets/AnalyticsWidget";
import { CallLogsWidget } from "./widgets/CallLogsWidget";
import { DateRange } from "react-day-picker";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardGridProps {
  layouts: {
    lg: Layout[];
    md: Layout[];
    sm: Layout[];
  };
  visibleWidgets: string[];
  dateRange?: DateRange;
  canSeeAdvancedMetrics: boolean;
  canSeeCallLogs: boolean;
  onLayoutChange: (newLayouts: { lg: Layout[]; md: Layout[]; sm: Layout[] }) => void;
}

export const DashboardGrid = ({
  layouts,
  visibleWidgets,
  dateRange,
  canSeeAdvancedMetrics,
  canSeeCallLogs,
  onLayoutChange,
}: DashboardGridProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleLayoutChange = (currentLayout: Layout[], allLayouts: any) => {
    // Only save if we have all breakpoints
    if (allLayouts.lg && allLayouts.md && allLayouts.sm) {
      onLayoutChange(allLayouts);
    }
  };

  const renderWidget = (widgetId: string) => {
    switch (widgetId) {
      case "call-metrics":
        return (
          <WidgetWrapper isDragging={isDragging}>
            <CallMetricsWidget canSeeAdvancedMetrics={canSeeAdvancedMetrics} dateRange={dateRange} />
          </WidgetWrapper>
        );
      case "order-metrics":
        if (!canSeeAdvancedMetrics) return null;
        return (
          <WidgetWrapper isDragging={isDragging}>
            <OrderMetricsWidget dateRange={dateRange} />
          </WidgetWrapper>
        );
      case "analytics":
        if (!canSeeAdvancedMetrics) return null;
        return (
          <WidgetWrapper isDragging={isDragging}>
            <AnalyticsWidget dateRange={dateRange} />
          </WidgetWrapper>
        );
      case "call-logs":
        return (
          <WidgetWrapper isDragging={isDragging}>
            <CallLogsWidget dateRange={dateRange} canSeeCallLogs={canSeeCallLogs} />
          </WidgetWrapper>
        );
      default:
        return null;
    }
  };

  // Filter layouts to only include visible widgets
  const filteredLayouts = {
    lg: layouts.lg.filter(layout => visibleWidgets.includes(layout.i)),
    md: layouts.md.filter(layout => visibleWidgets.includes(layout.i)),
    sm: layouts.sm.filter(layout => visibleWidgets.includes(layout.i)),
  };

  return (
    <ResponsiveGridLayout
      className="dashboard-grid"
      layouts={filteredLayouts}
      breakpoints={{ lg: 1200, md: 996, sm: 768 }}
      cols={{ lg: 12, md: 10, sm: 6 }}
      rowHeight={60}
      onLayoutChange={handleLayoutChange}
      onDragStart={() => setIsDragging(true)}
      onDragStop={() => setIsDragging(false)}
      draggableHandle=".cursor-grab"
      isDraggable={true}
      isResizable={false}
      compactType="vertical"
      preventCollision={true}
      margin={[20, 20]}
      containerPadding={[0, 0]}
    >
      {visibleWidgets.map((widgetId) => (
        <div key={widgetId} className="h-full w-full">
          {renderWidget(widgetId)}
        </div>
      ))}
    </ResponsiveGridLayout>
  );
};
