import { useState, useEffect } from "react";
import { Layout } from "react-grid-layout";
import { DashboardConfig, DEFAULT_LAYOUTS, AVAILABLE_WIDGETS } from "@/types/dashboard";

const STORAGE_KEY = "dashboard-layout";

export const useDashboardLayout = (userId?: string) => {
  const [config, setConfig] = useState<DashboardConfig>(() => {
    // Try to load saved layout from localStorage
    const saved = localStorage.getItem(`${STORAGE_KEY}-${userId || "default"}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved layout:", e);
      }
    }
    
    // Default config with all widgets visible
    return {
      layouts: DEFAULT_LAYOUTS,
      visibleWidgets: AVAILABLE_WIDGETS.map(w => w.id),
    };
  });

  // Save layout changes to localStorage
  const saveLayout = (newLayouts: { lg: Layout[]; md: Layout[]; sm: Layout[] }) => {
    const newConfig = {
      ...config,
      layouts: newLayouts,
    };
    setConfig(newConfig);
    localStorage.setItem(
      `${STORAGE_KEY}-${userId || "default"}`,
      JSON.stringify(newConfig)
    );
  };

  // Toggle widget visibility
  const toggleWidget = (widgetId: string) => {
    const newVisibleWidgets = config.visibleWidgets.includes(widgetId)
      ? config.visibleWidgets.filter(id => id !== widgetId)
      : [...config.visibleWidgets, widgetId];
    
    const newConfig = {
      ...config,
      visibleWidgets: newVisibleWidgets,
    };
    setConfig(newConfig);
    localStorage.setItem(
      `${STORAGE_KEY}-${userId || "default"}`,
      JSON.stringify(newConfig)
    );
  };

  // Reset to default layout
  const resetLayout = () => {
    const defaultConfig = {
      layouts: DEFAULT_LAYOUTS,
      visibleWidgets: AVAILABLE_WIDGETS.map(w => w.id),
    };
    setConfig(defaultConfig);
    localStorage.setItem(
      `${STORAGE_KEY}-${userId || "default"}`,
      JSON.stringify(defaultConfig)
    );
  };

  return {
    config,
    saveLayout,
    toggleWidget,
    resetLayout,
  };
};
