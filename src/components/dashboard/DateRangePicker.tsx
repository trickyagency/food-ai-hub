import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  className?: string;
}

const DateRangePicker = ({ dateRange, onDateRangeChange, className }: DateRangePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDateRangeChange(undefined);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-full sm:w-[300px] justify-start text-left font-normal bg-muted/30 border-border/50 hover:bg-muted/50 transition-all duration-300",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <span className="flex items-center gap-2">
                  {format(dateRange.from, "LLL dd, y")} -{" "}
                  {format(dateRange.to, "LLL dd, y")}
                  {dateRange && (
                    <X
                      className="h-4 w-4 ml-auto hover:text-destructive transition-colors"
                      onClick={handleClear}
                    />
                  )}
                </span>
              ) : (
                format(dateRange.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-0 bg-card border-border shadow-xl" 
          align="start"
          sideOffset={8}
        >
          <div className="p-3 border-b border-border bg-muted/30">
            <p className="text-sm font-medium text-foreground">Select Date Range</p>
            <p className="text-xs text-muted-foreground mt-1">
              Choose start and end dates for analytics
            </p>
          </div>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={onDateRangeChange}
            numberOfMonths={2}
            disabled={(date) => date > new Date()}
            className={cn("p-3 pointer-events-auto")}
          />
          <div className="p-3 border-t border-border flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onDateRangeChange(undefined);
                setIsOpen(false);
              }}
              className="flex-1"
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={() => setIsOpen(false)}
              disabled={!dateRange?.from || !dateRange?.to}
              className="flex-1"
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DateRangePicker;
