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
        relative h-full overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md
        transition-all duration-200
        ${isDragging ? "opacity-50 cursor-grabbing" : ""}
      `}
    >
      {/* Drag Handle */}
      <div className="absolute top-2 right-2 z-10 cursor-grab active:cursor-grabbing opacity-0 hover:opacity-100 transition-opacity">
        <div className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700">
          <GripVertical className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </div>
      </div>
      
      {/* Widget Content */}
      <div className="h-full overflow-auto">
        {children}
      </div>
    </div>
  );
};
