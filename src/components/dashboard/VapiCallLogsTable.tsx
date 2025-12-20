import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VapiCall } from "@/hooks/useVapiCalls";
import { ChevronLeft, ChevronRight, Eye, Search, X } from "lucide-react";
import { format } from "date-fns";
import CallDetailDialog from "./CallDetailDialog";
import SwipeableCallRow from "./SwipeableCallRow";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDuration } from "@/lib/utils";

interface VapiCallLogsTableProps {
  calls: VapiCall[];
  loading?: boolean;
}

const VapiCallLogsTable = ({ calls, loading }: VapiCallLogsTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCall, setSelectedCall] = useState<VapiCall | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const itemsPerPage = 10;
  const isMobile = useIsMobile();

  // Filter and sort calls
  const filteredCalls = useMemo(() => {
    let filtered = [...calls];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((call) => {
        const phoneNumber = call.customer?.number || call.phoneNumber?.number || "";
        const customerName = call.customer?.name || "";
        return (
          phoneNumber.toLowerCase().includes(query) ||
          customerName.toLowerCase().includes(query)
        );
      });
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((call) => {
        switch (statusFilter) {
          case "completed":
            return call.status === "ended" && call.endedReason !== "customer-did-not-answer";
          case "no-answer":
            return call.endedReason === "customer-did-not-answer";
          case "in-progress":
            return call.status === "in-progress";
          case "failed":
            return call.status !== "ended" && call.status !== "in-progress" && call.status !== "queued" && call.status !== "ringing";
          default:
            return true;
        }
      });
    }

    // Sort by date descending (most recent first)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  }, [calls, searchQuery, statusFilter]);

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery.trim() !== "" || statusFilter !== "all";

  const totalPages = Math.ceil(filteredCalls.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCalls = filteredCalls.slice(startIndex, endIndex);

  const getStatusBadge = (status: string, endedReason?: string) => {
    if (status === "ended") {
      if (endedReason === "customer-did-not-answer") {
        return <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700">No Answer</Badge>;
      }
      return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Completed</Badge>;
    }
    if (status === "in-progress") {
      return <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">In Progress</Badge>;
    }
    if (status === "queued" || status === "ringing") {
      return <Badge variant="outline">{status}</Badge>;
    }
    return <Badge variant="destructive">Failed</Badge>;
  };

  const getCallTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      inboundPhoneCall: "Inbound",
      outboundPhoneCall: "Outbound",
      webCall: "Web",
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Recent Calls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Recent Calls</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by phone number or name..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="no-answer">No Answer</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Filter Results Info */}
          {hasActiveFilters && (
            <div className="mb-4 text-sm text-muted-foreground">
              Showing {filteredCalls.length} of {calls.length} calls
            </div>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Summary</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-muted-foreground">Loading calls...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : currentCalls.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No calls found. Make some calls to see them here.
                    </TableCell>
                  </TableRow>
                ) : (
                  currentCalls.map((call) =>
                    isMobile ? (
                      <SwipeableCallRow
                        key={call.id}
                        call={call}
                        onViewDetails={setSelectedCall}
                        getStatusBadge={getStatusBadge}
                        getCallTypeLabel={getCallTypeLabel}
                      />
                    ) : (
                      <TableRow key={call.id} className="hover:bg-muted/50">
                        <TableCell>
                          <Badge variant="outline">{getCallTypeLabel(call.type)}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {call.customer?.number || call.phoneNumber?.number || "N/A"}
                        </TableCell>
                        <TableCell>
                          {call.duration ? formatDuration(call.duration) : "N/A"}
                        </TableCell>
                        <TableCell className="font-semibold">
                          ${(call.cost || 0).toFixed(4)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(call.status, call.endedReason)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell max-w-[200px]">
                          {call.summary ? (
                            <span 
                              className="text-sm text-muted-foreground truncate block cursor-pointer hover:text-foreground"
                              title={call.summary}
                              onClick={() => setSelectedCall(call)}
                            >
                              {call.summary.length > 60 ? `${call.summary.slice(0, 60)}...` : call.summary}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground/50 italic">No summary</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(call.createdAt), "MMM d, h:mm a")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedCall(call)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  )
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredCalls.length)} of {filteredCalls.length} calls
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <span className="text-sm font-medium px-4">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedCall && (
        <CallDetailDialog
          call={selectedCall}
          open={!!selectedCall}
          onClose={() => setSelectedCall(null)}
        />
      )}
    </>
  );
};

export default VapiCallLogsTable;
