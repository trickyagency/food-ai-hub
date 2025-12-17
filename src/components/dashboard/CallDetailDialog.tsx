import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { VapiCall } from "@/hooks/useVapiCalls";
import { format } from "date-fns";
import { Phone, Clock, DollarSign, MessageSquare, Volume2, Download, FileText } from "lucide-react";
import CallTagManager from "./CallTagManager";
import { formatDuration } from "@/lib/utils";

interface CallDetailDialogProps {
  call: VapiCall;
  open: boolean;
  onClose: () => void;
}

const CallDetailDialog = ({ call, open, onClose }: CallDetailDialogProps) => {
  const getCallTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      inboundPhoneCall: "Inbound Call",
      outboundPhoneCall: "Outbound Call",
      webCall: "Web Call",
    };
    return types[type] || type;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl">Call Details</DialogTitle>
          <DialogDescription>
            View complete information about this call
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Call Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Call Type</p>
              <Badge variant="outline" className="w-fit">
                {getCallTypeLabel(call.type)}
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge
                variant={call.status === "ended" ? "default" : "outline"}
                className="w-fit"
              >
                {call.status}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Call Summary */}
          {call.summary && (
            <>
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  Call Summary
                </h3>
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-sm leading-relaxed">{call.summary}</p>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              Contact Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Phone Number</p>
                <p className="text-sm sm:text-base font-mono break-all">
                  {call.customer?.number || "N/A"}
                </p>
              </div>
              {call.customer?.name && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Customer Name</p>
                  <p className="text-sm sm:text-base">{call.customer.name}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Call Metrics */}
          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              Call Metrics
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Duration</p>
                <p className="text-sm sm:text-base font-semibold">
                  {call.duration ? formatDuration(call.duration) : "N/A"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Time</p>
                <p className="text-sm sm:text-base break-all">
                  {format(new Date(call.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
              {call.endedReason && (
                <div className="space-y-1 col-span-full">
                  <p className="text-sm font-medium text-muted-foreground">Ended Reason</p>
                  <p className="text-sm sm:text-base">{call.endedReason}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Cost Breakdown */}
          {(call.costBreakdown || call.cost !== undefined) && (
            <>
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  Cost Breakdown
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Speech-to-Text</p>
                    <p className="text-base sm:text-lg font-bold">
                      ${(call.costBreakdown?.stt ?? 0).toFixed(4)}
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-1">LLM</p>
                    <p className="text-base sm:text-lg font-bold">
                      ${(call.costBreakdown?.llm ?? 0).toFixed(4)}
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Text-to-Speech</p>
                    <p className="text-base sm:text-lg font-bold">
                      ${(call.costBreakdown?.tts ?? 0).toFixed(4)}
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Vapi Platform</p>
                    <p className="text-base sm:text-lg font-bold">
                      ${(call.costBreakdown?.vapi ?? 0).toFixed(4)}
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Transport</p>
                    <p className="text-base sm:text-lg font-bold">
                      ${(call.costBreakdown?.transport ?? 0).toFixed(4)}
                    </p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg border-2 border-primary/20">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Total Cost</p>
                    <p className="text-base sm:text-lg font-bold text-primary">
                      ${(call.cost ?? call.costBreakdown?.total ?? 0).toFixed(4)}
                    </p>
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Audio Player */}
          {call.recordingUrl && (
            <>
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                  <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  Call Recording
                </h3>
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <audio controls className="w-full">
                    <source src={call.recordingUrl} type="audio/mpeg" />
                    <source src={call.recordingUrl} type="audio/wav" />
                    <source src={call.recordingUrl} type="audio/webm" />
                    Your browser does not support the audio element.
                  </audio>
                  <p className="text-xs text-muted-foreground">
                    Use the audio controls to play, pause, and adjust volume
                  </p>
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          const response = await fetch(call.recordingUrl);
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `call-recording-${call.id}.mp3`;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                        } catch (error) {
                          console.error("Download error:", error);
                        }
                      }}
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download MP3
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          const response = await fetch(call.recordingUrl);
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `call-recording-${call.id}.wav`;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                        } catch (error) {
                          console.error("Download error:", error);
                        }
                      }}
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download WAV
                    </Button>
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Transcript */}
          {call.transcript && (
            <>
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  Transcript
                </h3>
                <div className="p-4 bg-muted rounded-lg max-h-[300px] overflow-y-auto">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {call.transcript}
                  </p>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Call Tag Manager */}
          <CallTagManager callId={call.id} onTagSaved={onClose} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CallDetailDialog;
