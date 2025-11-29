import { useState, useEffect } from "react";
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
import { Phone, Clock, DollarSign, MessageSquare, Sparkles, Loader2, Volume2, CheckCircle2, ListChecks, Target } from "lucide-react";
import CallTagManager from "./CallTagManager";
import { useCallSummary } from "@/hooks/useCallSummary";

interface CallDetailDialogProps {
  call: VapiCall;
  open: boolean;
  onClose: () => void;
}

const CallDetailDialog = ({ call, open, onClose }: CallDetailDialogProps) => {
  const { summary, loading: summaryLoading, fetchSummary, generateSummary } = useCallSummary();
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (open && call.id) {
      fetchSummary(call.id);
    }
  }, [open, call.id]);

  const handleGenerateSummary = async () => {
    if (!call.transcript) {
      return;
    }
    setIsGenerating(true);
    await generateSummary(call.id, call.transcript);
    setIsGenerating(false);
  };

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

          {/* Audio Player */}
          {call.recordingUrl && (
            <>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-primary" />
                  Call Recording
                </h3>
                <div className="p-4 bg-muted rounded-lg">
                  <audio controls className="w-full">
                    <source src={call.recordingUrl} type="audio/mpeg" />
                    <source src={call.recordingUrl} type="audio/wav" />
                    <source src={call.recordingUrl} type="audio/webm" />
                    Your browser does not support the audio element.
                  </audio>
                  <p className="text-xs text-muted-foreground mt-2">
                    Use the audio controls to play, pause, and adjust volume
                  </p>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Transcript */}
          {call.transcript && (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    Transcript
                  </h3>
                  {!summary && (
                    <Button
                      size="sm"
                      onClick={handleGenerateSummary}
                      disabled={isGenerating || summaryLoading}
                      className="gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Generate AI Summary
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <div className="p-4 bg-muted rounded-lg max-h-[300px] overflow-y-auto">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {call.transcript}
                  </p>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* AI-Generated Summary */}
          {summary && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  AI Summary
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateSummary}
                  disabled={isGenerating || summaryLoading}
                  className="gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Regenerate
                    </>
                  )}
                </Button>
              </div>
              
              <div className="space-y-4">
                {/* Summary */}
                <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                  <p className="text-sm leading-relaxed">{summary.summary}</p>
                </div>

                {/* Key Points */}
                {summary.key_points && summary.key_points.length > 0 && (
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      Key Points
                    </h4>
                    <ul className="space-y-2">
                      {summary.key_points.map((point, index) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Items */}
                {summary.action_items && summary.action_items.length > 0 && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-amber-600" />
                      Action Items
                    </h4>
                    <ul className="space-y-2">
                      {summary.action_items.map((item, index) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <span className="text-amber-600 mt-0.5">→</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Outcome */}
                {summary.outcome && (
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4 text-green-600" />
                      Outcome
                    </h4>
                    <p className="text-sm">{summary.outcome}</p>
                  </div>
                )}
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
