import { Button } from "@/components/ui/button";
import { Calendar, Clock, TrendingUp } from "lucide-react";

type TimePeriod = "hours" | "days" | "weeks" | "months" | "years";

interface TimeFilterProps {
  selected: TimePeriod;
  onChange: (period: TimePeriod) => void;
}

const TimeFilter = ({ selected, onChange }: TimeFilterProps) => {
  const periods: { label: string; value: TimePeriod; icon: typeof Clock }[] = [
    { label: "24h", value: "hours", icon: Clock },
    { label: "7d", value: "days", icon: Calendar },
    { label: "4w", value: "weeks", icon: Calendar },
    { label: "12m", value: "months", icon: TrendingUp },
    { label: "All", value: "years", icon: TrendingUp },
  ];

  return (
    <div className="flex items-center gap-2 rounded-xl p-1 bg-muted/50 border border-border shadow-sm">
      {periods.map((period) => {
        const Icon = period.icon;
        return (
          <Button
            key={period.value}
            variant={selected === period.value ? "default" : "ghost"}
            size="sm"
            onClick={() => onChange(period.value)}
            className="min-w-[60px] rounded-lg"
          >
            <span className="text-xs font-semibold">{period.label}</span>
          </Button>
        );
      })}
    </div>
  );
};

export default TimeFilter;
