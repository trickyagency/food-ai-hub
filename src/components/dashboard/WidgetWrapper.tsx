import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { GripVertical } from "lucide-react";

interface WidgetWrapperProps {
  children: ReactNode;
  title?: string;
  isDragging?: boolean;
}

export const WidgetWrapper = ({ children, title, isDragging }: WidgetWrapperProps) => {
  return (
    <Card 
      className={`
        relative h-full overflow-hidden bg-card border border-border/60 shadow-elegant
        transition-all duration-200
        ${isDragging ? "opacity-50 cursor-grabbing" : ""}
      `}
    >
      {/* Drag Handle */}
      <div className="absolute top-2 right-2 z-10 cursor-grab active:cursor-grabbing opacity-0 hover:opacity-100 transition-opacity">
        <div className="p-1.5 rounded-md bg-muted/50 hover:bg-muted">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
      
      {/* Widget Content */}
      <div className="h-full overflow-auto">
        {children}
      </div>
    </Card>
  );
};
