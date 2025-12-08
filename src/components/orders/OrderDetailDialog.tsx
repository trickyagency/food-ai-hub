import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Phone, Clock, Calendar, FileText, ShoppingBag } from "lucide-react";
import { format } from "date-fns";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

interface OrderDetailDialogProps {
  order: Tables<"orders"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdate?: () => void;
}

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  modifications?: string[];
}

export const OrderDetailDialog = ({ order, open, onOpenChange, onStatusUpdate }: OrderDetailDialogProps) => {
  const [updating, setUpdating] = useState(false);

  if (!order) return null;

  const items = (order.items as unknown as OrderItem[]) || [];

  const handleStatusUpdate = async (newStatus: string) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", order.id);

      if (error) throw error;

      toast.success(`Order status updated to ${newStatus}`);
      onStatusUpdate?.();
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Failed to update order status");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Order Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Current Status:</span>
              <OrderStatusBadge status={order.status} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Update:</span>
              <Select
                value={order.status || "confirmed"}
                onValueChange={handleStatusUpdate}
                disabled={updating}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="preparing">Preparing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Customer Name</p>
              <p className="font-medium">{order.customer_name || "Unknown"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" /> Phone Number
              </p>
              <p className="font-medium">{order.customer_number}</p>
            </div>
          </div>

          <Separator />

          {/* Order Items */}
          <div>
            <h4 className="font-medium mb-3">Order Items</h4>
            <div className="space-y-3">
              {items.length > 0 ? (
                items.map((item, index) => (
                  <div key={index} className="flex justify-between items-start p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">
                        {item.quantity}x {item.name}
                      </p>
                      {item.modifications && item.modifications.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {item.modifications.join(", ")}
                        </p>
                      )}
                    </div>
                    <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">No items found</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Price Breakdown */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${Number(order.subtotal || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span>${Number(order.tax || 0).toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>${Number(order.total).toFixed(2)}</span>
            </div>
          </div>

          {/* Special Instructions */}
          {order.special_instructions && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                  <FileText className="h-3 w-3" /> Special Instructions
                </p>
                <p className="text-sm bg-muted/50 p-3 rounded-lg">{order.special_instructions}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Estimated Time
              </p>
              <p className="font-medium">{order.estimated_time || 30} minutes</p>
            </div>
            <div>
              <p className="text-muted-foreground">Call ID</p>
              <p className="font-mono text-xs truncate">{order.call_id}</p>
            </div>
            <div>
              <p className="text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Created
              </p>
              <p className="font-medium">
                {order.created_at ? format(new Date(order.created_at), "PPp") : "Unknown"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Order ID</p>
              <p className="font-mono text-xs truncate">{order.id}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
