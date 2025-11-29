import { Button } from "@/components/ui/button";

type TimePeriod = "hours" | "days" | "weeks" | "months" | "years";

interface TimeFilterProps {
  selected: TimePeriod;
  onChange: (period: TimePeriod) => void;
}

const TimeFilter = ({ selected, onChange }: TimeFilterProps) => {
  const periods: { label: string; value: TimePeriod }[] = [
    { label: "Hours", value: "hours" },
    { label: "Days", value: "days" },
    { label: "Weeks", value: "weeks" },
    { label: "Months", value: "months" },
    { label: "Years", value: "years" },
  ];

  return (
    <div className="flex gap-2 flex-wrap">
      {periods.map((period) => (
        <Button
          key={period.value}
          variant={selected === period.value ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(period.value)}
          className="min-w-[80px]"
        >
          {period.label}
        </Button>
      ))}
    </div>
  );
};

export default TimeFilter;
