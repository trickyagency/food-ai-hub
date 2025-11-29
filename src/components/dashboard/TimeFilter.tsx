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
    <div className="flex items-center gap-2 bg-muted/30 rounded-xl p-1.5 backdrop-blur-sm border border-border/50">
      {periods.map((period) => {
        const Icon = period.icon;
        return (
          <Button
            key={period.value}
            variant={selected === period.value ? "default" : "ghost"}
            size="sm"
            onClick={() => onChange(period.value)}
            className={`relative min-w-[60px] h-9 transition-all duration-300 ${
              selected === period.value 
                ? "shadow-md" 
                : "hover:bg-muted/50"
            }`}
          >
            <Icon className="w-3 h-3 mr-1.5" />
            <span className="text-xs font-semibold">{period.label}</span>
          </Button>
        );
      })}
    </div>
  );
};

export default TimeFilter;
