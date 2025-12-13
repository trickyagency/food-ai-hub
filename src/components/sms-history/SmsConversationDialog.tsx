import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, XCircle, Clock, MessageSquare, Package } from "lucide-react";
import { format } from "date-fns";
import type { Json } from "@/integrations/supabase/types";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface SmsRecord {
  id: string;
  customer_number: string;
  message_content: string;
  status: string;
  twilio_sid: string | null;
  created_at: string;
  error_message: string | null;
  call_id: string | null;
  order_details: Json | null;
  user_id: string | null;
}

interface Conversation {
  customer_number: string;
  messages: SmsRecord[];
  lastMessage: SmsRecord;
  messageCount: number;
}

interface SmsConversationDialogProps {
  conversation: Conversation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SmsConversationDialog = ({
  conversation,
  open,
  onOpenChange,
}: SmsConversationDialogProps) => {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  if (!conversation) return null;

  const formatPhoneNumber = (phone: string) => {
    if (phone.startsWith("+1") && phone.length === 12) {
      return `(${phone.slice(2, 5)}) ${phone.slice(5, 8)}-${phone.slice(8)}`;
    }
    return phone;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30 text-xs">
            <CheckCircle className="w-3 h-3 mr-1" />
            Delivered
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="secondary" className="text-xs">{status}</Badge>;
    }
  };

  const renderOrderDetails = (message: SmsRecord) => {
    if (!message.order_details) return null;

    const isExpanded = expandedOrderId === message.id;
    const orderDetails = message.order_details as Record<string, unknown>;

    return (
      <div className="mt-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setExpandedOrderId(isExpanded ? null : message.id)}
        >
          <Package className="w-3 h-3 mr-1" />
          {isExpanded ? "Hide" : "View"} Order Details
        </Button>
        
        {isExpanded && (
          <div className="mt-2 p-3 bg-muted/50 rounded-lg text-xs space-y-1">
            {orderDetails.customer_name && (
              <p><span className="text-muted-foreground">Customer:</span> {String(orderDetails.customer_name)}</p>
            )}
            {orderDetails.total && (
              <p><span className="text-muted-foreground">Total:</span> ${Number(orderDetails.total).toFixed(2)}</p>
            )}
            {orderDetails.items && Array.isArray(orderDetails.items) && (
              <div>
                <span className="text-muted-foreground">Items:</span>
                <ul className="mt-1 space-y-0.5 pl-3">
                  {(orderDetails.items as Array<{ name?: string; quantity?: number; price?: number }>).map((item, i) => (
                    <li key={i}>
                      {item.quantity}x {item.name} - ${Number(item.price || 0).toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {message.call_id && (
              <p><span className="text-muted-foreground">Call ID:</span> {message.call_id.slice(0, 20)}...</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">
                {formatPhoneNumber(conversation.customer_number)}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {conversation.messageCount} {conversation.messageCount === 1 ? "message" : "messages"}
              </p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-4 py-4">
            {conversation.messages.map((message) => (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-[85%] space-y-1">
                  {/* Message bubble - outbound messages on right */}
                  <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3">
                    <p className="text-sm whitespace-pre-wrap">{message.message_content}</p>
                  </div>
                  
                  {/* Message metadata */}
                  <div className="flex items-center justify-end gap-2 px-1">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(message.created_at), "MMM d, h:mm a")}
                    </span>
                    {getStatusBadge(message.status)}
                  </div>

                  {/* Order details (expandable) */}
                  {renderOrderDetails(message)}

                  {/* Error message */}
                  {message.status === "failed" && message.error_message && (
                    <div className="px-1">
                      <p className="text-xs text-destructive">
                        Error: {message.error_message}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Future: Input for sending new messages */}
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Outbound messages only • Inbound SMS coming soon
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SmsConversationDialog;
