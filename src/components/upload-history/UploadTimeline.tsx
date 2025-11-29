import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Clock, RefreshCw, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface TimelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId: string;
}

interface WebhookResponse {
  id: string;
  file_name: string;
  status_code: number | null;
  response_body: any;
  error_message: string | null;
  retry_count: number | null;
  success: boolean | null;
  created_at: string;
}

interface UploadHistoryRecord {
  id: string;
  file_id: string;
  file_name: string;
  upload_status: string;
  retry_count: number | null;
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
}

const UploadTimeline = ({ open, onOpenChange, fileId }: TimelineDialogProps) => {
  const [loading, setLoading] = useState(true);
  const [uploadRecord, setUploadRecord] = useState<UploadHistoryRecord | null>(null);
  const [webhookResponses, setWebhookResponses] = useState<WebhookResponse[]>([]);

  useEffect(() => {
    if (open && fileId) {
      fetchTimelineData();
    }
  }, [open, fileId]);

  const fetchTimelineData = async () => {
    try {
      setLoading(true);

      // Fetch upload history record
      const { data: historyData, error: historyError } = await supabase
        .from("file_upload_history")
        .select("*")
        .eq("file_id", fileId)
        .single();

      if (historyError) throw historyError;
      setUploadRecord(historyData);

      // Fetch all webhook responses for this file
      const { data: webhookData, error: webhookError } = await supabase
        .from("webhook_responses")
        .select("*")
        .eq("file_name", historyData.file_name)
        .order("created_at", { ascending: true });

      if (webhookError) throw webhookError;
      setWebhookResponses(webhookData || []);
    } catch (error) {
      console.error("Error fetching timeline data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getEventIcon = (status: string | null, success: boolean | null) => {
    if (success) {
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    }
    if (success === false) {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
    return <Clock className="w-5 h-5 text-amber-500" />;
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Upload Timeline</DialogTitle>
            <DialogDescription>Loading timeline data...</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Upload Timeline: {uploadRecord?.file_name}</DialogTitle>
          <DialogDescription>
            Detailed timeline of all upload attempts and responses
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Initial Upload Record */}
          {uploadRecord && (
            <Card className="p-4 bg-gradient-card border-border/50">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {uploadRecord.upload_status === "success" ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : uploadRecord.upload_status === "failed" ? (
                    <XCircle className="w-6 h-6 text-red-500" />
                  ) : (
                    <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">Upload Initiated</p>
                    <Badge variant="outline" className="text-xs">
                      {uploadRecord.upload_status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(uploadRecord.created_at)}
                  </p>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      File ID: <span className="font-mono">{uploadRecord.file_id}</span>
                    </p>
                    {uploadRecord.retry_count !== null && uploadRecord.retry_count > 0 && (
                      <p className="text-xs text-amber-500 font-medium">
                        Total Retries: {uploadRecord.retry_count}
                      </p>
                    )}
                  </div>
                  {uploadRecord.completed_at && (
                    <p className="text-xs text-muted-foreground">
                      Completed: {formatDate(uploadRecord.completed_at)}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Timeline of webhook responses */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                Webhook Attempts ({webhookResponses.length})
              </h3>
            </div>

            {webhookResponses.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No webhook responses recorded
              </p>
            ) : (
              <div className="space-y-3">
                {webhookResponses.map((response, index) => (
                  <Card key={response.id} className="p-4 bg-card border-border">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">{getEventIcon(response.status_code?.toString() || null, response.success)}</div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-foreground">
                            Attempt #{index + 1}
                            {response.retry_count !== null && response.retry_count > 0 && (
                              <span className="text-amber-500 ml-2 text-sm">
                                (Retry {response.retry_count})
                              </span>
                            )}
                          </p>
                          {response.status_code && (
                            <Badge
                              variant={response.success ? "default" : "destructive"}
                              className="text-xs"
                            >
                              HTTP {response.status_code}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(response.created_at)}
                        </p>

                        {/* Response Body */}
                        {response.response_body && (
                          <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-border">
                            <p className="text-xs font-semibold text-foreground mb-2">
                              Response:
                            </p>
                            <pre className="text-xs text-foreground overflow-x-auto">
                              {JSON.stringify(response.response_body, null, 2)}
                            </pre>
                          </div>
                        )}

                        {/* Error Message */}
                        {response.error_message && (
                          <div className="mt-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                            <p className="text-xs font-semibold text-red-500 mb-1">
                              Error:
                            </p>
                            <p className="text-xs text-red-500 break-words">
                              {response.error_message}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UploadTimeline;
