import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, XCircle, Clock, Phone, Calendar, FileText, AlertCircle, Hash } from "lucide-react";
import { format } from "date-fns";
import type { Json } from "@/integrations/supabase/types";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface OrderDetails {
  items?: OrderItem[];
  total?: number;
  subtotal?: number;
  tax?: number;
  special_instructions?: string;
  estimated_time?: number;
}

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

interface SmsDetailDialogProps {
  record: SmsRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SmsDetailDialog = ({ record, open, onOpenChange }: SmsDetailDialogProps) => {
  if (!record) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Delivered
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatPhoneNumber = (phone: string) => {
    if (phone.startsWith("+1") && phone.length === 12) {
      return `(${phone.slice(2, 5)}) ${phone.slice(5, 8)}-${phone.slice(8)}`;
    }
    return phone;
  };

  const orderDetails = record.order_details as OrderDetails | null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            SMS Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status & Timestamp */}
          <div className="flex items-center justify-between">
            {getStatusBadge(record.status)}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {format(new Date(record.created_at), "MMM d, yyyy 'at' HH:mm:ss")}
            </div>
          </div>

          <Separator />

          {/* Customer Info */}
          <div className="space-y-3">
            <h4 className="font-medium text-foreground flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" />
              Customer Information
            </h4>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="font-mono text-lg">{formatPhoneNumber(record.customer_number)}</p>
            </div>
          </div>

          {/* Message Content */}
          <div className="space-y-3">
            <h4 className="font-medium text-foreground">Message Content</h4>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {record.message_content}
              </p>
            </div>
          </div>

          {/* Order Details */}
          {orderDetails && (
            <div className="space-y-3">
              <h4 className="font-medium text-foreground">Order Details</h4>
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                {orderDetails.items && orderDetails.items.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Items</p>
                    <ul className="space-y-1">
                      {orderDetails.items.map((item, index) => (
                        <li key={index} className="flex justify-between text-sm">
                          <span>
                            {item.quantity}x {item.name}
                          </span>
                          <span className="font-medium">${item.price.toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {(orderDetails.subtotal || orderDetails.tax || orderDetails.total) && (
                  <div className="border-t border-border pt-2 space-y-1">
                    {orderDetails.subtotal && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>${orderDetails.subtotal.toFixed(2)}</span>
                      </div>
                    )}
                    {orderDetails.tax && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax</span>
                        <span>${orderDetails.tax.toFixed(2)}</span>
                      </div>
                    )}
                    {orderDetails.total && (
                      <div className="flex justify-between text-sm font-semibold">
                        <span>Total</span>
                        <span>${orderDetails.total.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}

                {orderDetails.special_instructions && (
                  <div className="border-t border-border pt-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-1">
                      Special Instructions
                    </p>
                    <p className="text-sm">{orderDetails.special_instructions}</p>
                  </div>
                )}

                {orderDetails.estimated_time && (
                  <div className="border-t border-border pt-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-1">
                      Estimated Time
                    </p>
                    <p className="text-sm">{orderDetails.estimated_time} minutes</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Twilio SID */}
          {record.twilio_sid && (
            <div className="space-y-3">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <Hash className="w-4 h-4 text-primary" />
                Twilio Reference
              </h4>
              <div className="bg-muted/50 rounded-lg p-4">
                <code className="text-xs break-all">{record.twilio_sid}</code>
              </div>
            </div>
          )}

          {/* Call ID */}
          {record.call_id && (
            <div className="space-y-3">
              <h4 className="font-medium text-foreground">Associated Call</h4>
              <div className="bg-muted/50 rounded-lg p-4">
                <code className="text-xs break-all">{record.call_id}</code>
              </div>
            </div>
          )}

          {/* Error Message */}
          {record.error_message && (
            <div className="space-y-3">
              <h4 className="font-medium text-destructive flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Error Details
              </h4>
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                <p className="text-sm text-destructive">{record.error_message}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SmsDetailDialog;
