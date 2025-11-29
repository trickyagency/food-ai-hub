import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings2, RotateCcw } from "lucide-react";
import { AVAILABLE_WIDGETS } from "@/types/dashboard";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface DashboardCustomizerProps {
  visibleWidgets: string[];
  onToggleWidget: (widgetId: string) => void;
  onResetLayout: () => void;
}

export const DashboardCustomizer = ({
  visibleWidgets,
  onToggleWidget,
  onResetLayout,
}: DashboardCustomizerProps) => {
  const [open, setOpen] = useState(false);

  const handleReset = () => {
    onResetLayout();
    toast.success("Dashboard layout reset to default");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="w-4 h-4" />
          Customize
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Customize Dashboard</DialogTitle>
          <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
            Choose which widgets to display on your dashboard
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Widget Toggles */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Visible Widgets</h3>
            <div className="space-y-3">
              {AVAILABLE_WIDGETS.map((widget) => (
                <div
                  key={widget.id}
                  className="flex items-start justify-between gap-4 p-3 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex-1">
                    <Label
                      htmlFor={widget.id}
                      className="text-sm font-medium cursor-pointer text-slate-900 dark:text-slate-100"
                    >
                      {widget.title}
                    </Label>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      {widget.description}
                    </p>
                  </div>
                  <Switch
                    id={widget.id}
                    checked={visibleWidgets.includes(widget.id)}
                    onCheckedChange={() => onToggleWidget(widget.id)}
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator className="bg-slate-200 dark:bg-slate-800" />

          {/* Reset Button */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Layout</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="w-full gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Default
            </Button>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Restore original widget positions and sizes
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
