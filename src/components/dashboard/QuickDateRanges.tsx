import { Button } from "@/components/ui/button";
import { Calendar, Clock } from "lucide-react";
import { DateRange } from "react-day-picker";
import { subDays, subMonths, startOfMonth, endOfMonth, startOfYear } from "date-fns";

interface QuickDateRangesProps {
  onSelectRange: (range: DateRange | undefined) => void;
}

const QuickDateRanges = ({ onSelectRange }: QuickDateRangesProps) => {
  const today = new Date();

  const ranges = [
    {
      label: "Today",
      icon: Clock,
      range: { from: today, to: today },
    },
    {
      label: "Last 7 Days",
      icon: Calendar,
      range: { from: subDays(today, 7), to: today },
    },
    {
      label: "Last 30 Days",
      icon: Calendar,
      range: { from: subDays(today, 30), to: today },
    },
    {
      label: "This Month",
      icon: Calendar,
      range: { from: startOfMonth(today), to: endOfMonth(today) },
    },
    {
      label: "Last 3 Months",
      icon: Calendar,
      range: { from: subMonths(today, 3), to: today },
    },
    {
      label: "This Year",
      icon: Calendar,
      range: { from: startOfYear(today), to: today },
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {ranges.map((item) => {
        const Icon = item.icon;
        return (
          <Button
            key={item.label}
            variant="outline"
            size="sm"
            onClick={() => onSelectRange(item.range)}
            className="text-xs hover:bg-primary/10 hover:border-primary/50 transition-all duration-300"
          >
            <Icon className="w-3 h-3 mr-1.5" />
            {item.label}
          </Button>
        );
      })}
    </div>
  );
};

export default QuickDateRanges;
