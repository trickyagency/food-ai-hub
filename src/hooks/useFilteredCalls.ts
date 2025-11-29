import { useMemo } from "react";
import { VapiCall } from "./useVapiCalls";
import { CallFilterOptions } from "@/components/dashboard/CallFilters";
import { startOfDay, endOfDay, subDays, isWithinInterval, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";

interface CallTag {
  call_id: string;
  category: string;
}

export const useFilteredCalls = (calls: VapiCall[], filters: CallFilterOptions) => {
  const { user } = useAuth();
  const [callTags, setCallTags] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      fetchCallTags();
    }
  }, [user]);

  const fetchCallTags = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("call_tags")
      .select("call_id, category")
      .eq("user_id", user.id);

    if (!error && data) {
      const tagsMap: Record<string, string> = {};
      data.forEach((tag) => {
        tagsMap[tag.call_id] = tag.category;
      });
      setCallTags(tagsMap);
    }
  };

  const filteredCalls = useMemo(() => {
    let filtered = [...calls];

    // Date range filtering
    if (filters.dateRange !== "all") {
      const now = new Date();
      let startDate: Date;
      let endDate = endOfDay(now);

      switch (filters.dateRange) {
        case "today":
          startDate = startOfDay(now);
          break;
        case "7days":
          startDate = startOfDay(subDays(now, 7));
          break;
        case "30days":
          startDate = startOfDay(subDays(now, 30));
          break;
        case "custom":
          if (filters.customStartDate && filters.customEndDate) {
            startDate = startOfDay(filters.customStartDate);
            endDate = endOfDay(filters.customEndDate);
          } else {
            return filtered;
          }
          break;
        default:
          return filtered;
      }

      filtered = filtered.filter((call) => {
        const callDate = parseISO(call.createdAt);
        return isWithinInterval(callDate, { start: startDate, end: endDate });
      });
    }

    // Category filtering (from tagged calls)
    if (filters.category) {
      filtered = filtered.filter((call) => callTags[call.id] === filters.category);
    }

    // Status filtering
    if (filters.status) {
      filtered = filtered.filter((call) => call.status === filters.status);
    }

    // Type filtering
    if (filters.type) {
      filtered = filtered.filter((call) => call.type === filters.type);
    }

    return filtered;
  }, [calls, filters, callTags]);

  return {
    filteredCalls,
    totalCalls: calls.length,
    filteredCount: filteredCalls.length,
  };
};
