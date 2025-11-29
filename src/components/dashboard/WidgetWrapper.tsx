import { ReactNode, useState } from "react";
import { GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WidgetWrapperProps {
  children: ReactNode;
  title?: string;
  isDragging?: boolean;
}

export const WidgetWrapper = ({ children, title, isDragging }: WidgetWrapperProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div 
      className={`
        relative h-full overflow-visible bg-card border border-border rounded-xl shadow-md hover:shadow-xl
        transition-all duration-300
        ${isDragging ? "opacity-50 cursor-grabbing" : ""}
      `}
    >
      {/* Header with Drag Handle and Collapse Button */}
      <div className="flex items-center justify-end gap-2 absolute top-3 right-3 z-10">
        {/* Collapse/Expand Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8 p-0 rounded-lg bg-muted hover:bg-muted/80 shadow-sm"
        >
          {isCollapsed ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          )}
        </Button>

        {/* Drag Handle */}
        <div className="cursor-grab active:cursor-grabbing opacity-0 hover:opacity-100 transition-opacity">
          <div className="p-2 rounded-lg bg-muted hover:bg-muted/80 shadow-sm">
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </div>
      
      {/* Widget Content */}
      <div className={isCollapsed ? "hidden" : "h-full overflow-visible"}>
        {children}
      </div>

      {/* Collapsed State Placeholder */}
      {isCollapsed && (
        <div className="p-6 text-center">
          <p className="text-sm text-muted-foreground">Widget collapsed - Click to expand</p>
        </div>
      )}
    </div>
  );
};