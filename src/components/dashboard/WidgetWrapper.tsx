import { ReactNode } from "react";
import { GripVertical } from "lucide-react";

interface WidgetWrapperProps {
  children: ReactNode;
  title?: string;
  isDragging?: boolean;
}

export const WidgetWrapper = ({ children, title, isDragging }: WidgetWrapperProps) => {
  return (
    <div 
      className={`
        relative h-full overflow-hidden bg-card border border-border rounded-xl shadow-md hover:shadow-xl
        transition-all duration-300
        ${isDragging ? "opacity-50 cursor-grabbing" : ""}
      `}
    >
      {/* Drag Handle */}
      <div className="absolute top-3 right-3 z-10 cursor-grab active:cursor-grabbing opacity-0 hover:opacity-100 transition-opacity">
        <div className="p-2 rounded-lg bg-muted hover:bg-muted/80 shadow-sm">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
      
      {/* Widget Content */}
      <div className="h-full overflow-auto">
        {children}
      </div>
    </div>
  );
};
