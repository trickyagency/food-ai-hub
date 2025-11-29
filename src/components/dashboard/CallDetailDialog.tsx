import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { VapiCall } from "@/hooks/useVapiCalls";
import { format } from "date-fns";
import { Phone, Clock, DollarSign, MessageSquare } from "lucide-react";
import CallTagManager from "./CallTagManager";

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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Call Details</DialogTitle>
          <DialogDescription>
            View complete information about this call
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Call Info */}
          <div className="grid grid-cols-2 gap-4">
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

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary" />
              Contact Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Phone Number</p>
                <p className="text-base font-mono">
                  {call.customer?.number || call.phoneNumber?.number || "N/A"}
                </p>
              </div>
              {call.customer?.name && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Customer Name</p>
                  <p className="text-base">{call.customer.name}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Call Metrics */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Call Metrics
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Duration</p>
                <p className="text-base font-semibold">
                  {call.duration
                    ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s`
                    : "N/A"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Time</p>
                <p className="text-base">
                  {format(new Date(call.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
              {call.endedReason && (
                <div className="space-y-1 col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Ended Reason</p>
                  <p className="text-base">{call.endedReason}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Cost Breakdown */}
          {call.costBreakdown && (
            <>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  Cost Breakdown
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-1">STT</p>
                    <p className="text-lg font-bold">
                      ${(call.costBreakdown.stt || 0).toFixed(4)}
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-1">LLM</p>
                    <p className="text-lg font-bold">
                      ${(call.costBreakdown.llm || 0).toFixed(4)}
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-1">TTS</p>
                    <p className="text-lg font-bold">
                      ${(call.costBreakdown.tts || 0).toFixed(4)}
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Vapi</p>
                    <p className="text-lg font-bold">
                      ${(call.costBreakdown.vapi || 0).toFixed(4)}
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Transport</p>
                    <p className="text-lg font-bold">
                      ${(call.costBreakdown.transport || 0).toFixed(4)}
                    </p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg border-2 border-primary/20">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Total</p>
                    <p className="text-lg font-bold text-primary">
                      ${(call.cost || 0).toFixed(4)}
                    </p>
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Transcript */}
          {call.transcript && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Transcript
              </h3>
              <div className="p-4 bg-muted rounded-lg max-h-[300px] overflow-y-auto">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {call.transcript}
                </p>
              </div>
            </div>
          )}

          {/* Audio Player */}
          {call.recordingUrl && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Recording</h3>
              <audio controls className="w-full">
                <source src={call.recordingUrl} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          {/* Summary */}
          {call.summary && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Summary</h3>
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                <p className="text-sm leading-relaxed">{call.summary}</p>
              </div>
            </div>
          )}

          {/* Call Tag Manager */}
          <CallTagManager callId={call.id} onTagSaved={onClose} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CallDetailDialog;
