import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CalendarIcon, Filter, X } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

export interface CallFilterOptions {
  dateRange: "all" | "today" | "7days" | "30days" | "custom";
  customStartDate?: Date;
  customEndDate?: Date;
  category?: string;
  status?: string;
  type?: string;
}

interface CallFiltersProps {
  filters: CallFilterOptions;
  onFiltersChange: (filters: CallFilterOptions) => void;
}

const CallFilters = ({ filters, onFiltersChange }: CallFiltersProps) => {
  const hasActiveFilters =
    filters.dateRange !== "all" || filters.category || filters.status || filters.type;

  const handleDateRangeChange = (range: CallFilterOptions["dateRange"]) => {
    onFiltersChange({
      ...filters,
      dateRange: range,
      customStartDate: undefined,
      customEndDate: undefined,
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      dateRange: "all",
      customStartDate: undefined,
      customEndDate: undefined,
      category: undefined,
      status: undefined,
      type: undefined,
    });
  };

  const getDateRangeLabel = () => {
    if (filters.dateRange === "custom" && filters.customStartDate && filters.customEndDate) {
      return `${format(filters.customStartDate, "MMM d")} - ${format(filters.customEndDate, "MMM d")}`;
    }
    const labels = {
      all: "All Time",
      today: "Today",
      "7days": "Last 7 Days",
      "30days": "Last 30 Days",
      custom: "Custom Range",
    };
    return labels[filters.dateRange];
  };

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-card border border-border/50 rounded-lg">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Filter className="w-4 h-4" />
        Filters:
      </div>

      {/* Date Range Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <CalendarIcon className="w-4 h-4" />
            {getDateRangeLabel()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="space-y-4">
            <div className="space-y-2">
              <Button
                variant={filters.dateRange === "today" ? "default" : "outline"}
                size="sm"
                className="w-full"
                onClick={() => handleDateRangeChange("today")}
              >
                Today
              </Button>
              <Button
                variant={filters.dateRange === "7days" ? "default" : "outline"}
                size="sm"
                className="w-full"
                onClick={() => handleDateRangeChange("7days")}
              >
                Last 7 Days
              </Button>
              <Button
                variant={filters.dateRange === "30days" ? "default" : "outline"}
                size="sm"
                className="w-full"
                onClick={() => handleDateRangeChange("30days")}
              >
                Last 30 Days
              </Button>
              <Button
                variant={filters.dateRange === "all" ? "default" : "outline"}
                size="sm"
                className="w-full"
                onClick={() => handleDateRangeChange("all")}
              >
                All Time
              </Button>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Custom Range</p>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Start Date</p>
                  <Calendar
                    mode="single"
                    selected={filters.customStartDate}
                    onSelect={(date) =>
                      onFiltersChange({
                        ...filters,
                        dateRange: "custom",
                        customStartDate: date,
                      })
                    }
                    className={cn("pointer-events-auto")}
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">End Date</p>
                  <Calendar
                    mode="single"
                    selected={filters.customEndDate}
                    onSelect={(date) =>
                      onFiltersChange({
                        ...filters,
                        dateRange: "custom",
                        customEndDate: date,
                      })
                    }
                    disabled={(date) =>
                      filters.customStartDate ? date < filters.customStartDate : false
                    }
                    className={cn("pointer-events-auto")}
                  />
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Category Filter */}
      <Select
        value={filters.category || "all"}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            category: value === "all" ? undefined : value,
          })
        }
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          <SelectItem value="sales">Sales</SelectItem>
          <SelectItem value="support">Support</SelectItem>
          <SelectItem value="follow-up">Follow-up</SelectItem>
          <SelectItem value="general">General</SelectItem>
        </SelectContent>
      </Select>

      {/* Status Filter */}
      <Select
        value={filters.status || "all"}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            status: value === "all" ? undefined : value,
          })
        }
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="ended">Completed</SelectItem>
          <SelectItem value="in-progress">In Progress</SelectItem>
          <SelectItem value="queued">Queued</SelectItem>
        </SelectContent>
      </Select>

      {/* Type Filter */}
      <Select
        value={filters.type || "all"}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            type: value === "all" ? undefined : value,
          })
        }
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Call Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="inboundPhoneCall">Inbound</SelectItem>
          <SelectItem value="outboundPhoneCall">Outbound</SelectItem>
          <SelectItem value="webCall">Web</SelectItem>
        </SelectContent>
      </Select>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="gap-2"
          >
            <X className="w-4 h-4" />
            Clear All
          </Button>
        </>
      )}
    </div>
  );
};

export default CallFilters;
