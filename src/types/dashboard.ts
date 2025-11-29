export interface DashboardWidget {
  id: string;
  type: "call-metrics" | "order-metrics" | "analytics" | "call-logs";
  title: string;
  description: string;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

export interface WidgetLayout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

export interface DashboardConfig {
  layouts: {
    lg: WidgetLayout[];
    md: WidgetLayout[];
    sm: WidgetLayout[];
  };
  visibleWidgets: string[];
}

export const AVAILABLE_WIDGETS: DashboardWidget[] = [
  {
    id: "call-metrics",
    type: "call-metrics",
    title: "Call Metrics",
    description: "Real-time call statistics and performance indicators",
    minW: 3,
    minH: 2,
  },
  {
    id: "call-logs",
    type: "call-logs",
    title: "Call Logs",
    description: "Recent call history with conversation details",
    minW: 6,
    minH: 4,
  },
];

export const DEFAULT_LAYOUTS = {
  lg: [
    { i: "call-metrics", x: 0, y: 0, w: 12, h: 3, minW: 3, minH: 2, maxH: 5 },
    { i: "call-logs", x: 0, y: 3, w: 12, h: 10, minW: 6, minH: 4, maxH: 15 },
  ],
  md: [
    { i: "call-metrics", x: 0, y: 0, w: 10, h: 3, minW: 3, minH: 2, maxH: 5 },
    { i: "call-logs", x: 0, y: 3, w: 10, h: 10, minW: 6, minH: 4, maxH: 15 },
  ],
  sm: [
    { i: "call-metrics", x: 0, y: 0, w: 6, h: 3, minW: 3, minH: 2, maxH: 5 },
    { i: "call-logs", x: 0, y: 3, w: 6, h: 10, minW: 6, minH: 4, maxH: 15 },
  ],
};
