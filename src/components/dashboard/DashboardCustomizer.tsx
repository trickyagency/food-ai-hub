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
          <DialogTitle className="text-xl font-bold">Customize Dashboard</DialogTitle>
          <DialogDescription>
            Choose which widgets to display and arrange them by dragging
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Widget Toggles */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Visible Widgets</h3>
            <div className="space-y-3">
              {AVAILABLE_WIDGETS.map((widget) => (
                <div
                  key={widget.id}
                  className="flex items-start justify-between gap-4 p-3 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <Label
                      htmlFor={widget.id}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {widget.title}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
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

          <Separator />

          {/* Reset Button */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Layout</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="w-full gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Default Layout
            </Button>
            <p className="text-xs text-muted-foreground">
              This will restore the original widget positions and sizes
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
