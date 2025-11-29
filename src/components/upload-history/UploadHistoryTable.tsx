import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, FileText, CheckCircle2, XCircle, Clock, Loader2, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import UploadTimeline from "./UploadTimeline";
import ExportData from "./ExportData";

interface UploadHistoryRecord {
  id: string;
  file_id: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  user_id: string;
  upload_status: string;
  webhook_url: string | null;
  error_message: string | null;
  retry_count: number | null;
  created_at: string;
  completed_at: string | null;
}

const ITEMS_PER_PAGE = 20;

const UploadHistoryTable = () => {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<UploadHistoryRecord[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<UploadHistoryRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [timelineDialog, setTimelineDialog] = useState<{ open: boolean; fileId: string | null }>({
    open: false,
    fileId: null,
  });

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    filterHistory();
  }, [searchQuery, statusFilter, history]);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("file_upload_history")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHistory(data || []);
      setFilteredHistory(data || []);
    } catch (error) {
      console.error("Error fetching upload history:", error);
      toast.error("Failed to load upload history");
    } finally {
      setLoading(false);
    }
  };

  const filterHistory = () => {
    let filtered = [...history];

    // Filter by search query (file ID, file name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (record) =>
          record.file_id.toLowerCase().includes(query) ||
          record.file_name.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((record) => record.upload_status === statusFilter);
    }

    setFilteredHistory(filtered);
    setCurrentPage(1);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Success
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case "uploading":
        return (
          <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Uploading
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE);
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (loading) {
    return (
      <Card className="bg-gradient-card border-border/50 shadow-elegant">
        <CardContent className="py-16">
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <Loader2 className="h-12 w-12 animate-spin" />
            <p className="text-lg font-medium">Loading upload history...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-border/50 shadow-elegant">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Upload History Records
            </CardTitle>
            <CardDescription>
              Search by file ID or name and filter by status
            </CardDescription>
          </div>
          <ExportData />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by file ID or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="uploading">Uploading</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          Showing {paginatedHistory.length} of {filteredHistory.length} results
        </div>

        {/* History Table */}
        {paginatedHistory.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-8 text-muted-foreground">
            <FileText className="h-12 w-12" />
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">No upload history found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {paginatedHistory.map((record) => (
              <div
                key={record.id}
                className="flex flex-col gap-3 p-4 rounded-lg bg-card border border-border hover:border-primary/30 transition-all duration-200"
              >
                <div className="flex flex-wrap items-start gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {record.file_name}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono bg-muted px-2 py-0.5 rounded">
                        ID: {record.file_id.slice(0, 8)}...
                      </span>
                      <span>•</span>
                      <span>{formatFileSize(record.file_size)}</span>
                      <span>•</span>
                      <span>{formatDate(record.created_at)}</span>
                      {record.retry_count && record.retry_count > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-amber-500 font-medium">
                            {record.retry_count} retries
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {getStatusBadge(record.upload_status)}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTimelineDialog({ open: true, fileId: record.file_id })}
                    className="flex-shrink-0 hover:bg-primary/10 hover:text-primary"
                    title="View detailed timeline"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>

                {record.error_message && (
                  <div className="ml-8 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-xs font-medium text-red-500 break-words">
                      Error: {record.error_message}
                    </p>
                  </div>
                )}

                {record.completed_at && (
                  <div className="ml-8 text-xs text-muted-foreground">
                    Completed: {formatDate(record.completed_at)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Timeline Dialog */}
      {timelineDialog.fileId && (
        <UploadTimeline
          open={timelineDialog.open}
          onOpenChange={(open) => setTimelineDialog({ open, fileId: null })}
          fileId={timelineDialog.fileId}
        />
      )}
    </Card>
  );
};

export default UploadHistoryTable;
