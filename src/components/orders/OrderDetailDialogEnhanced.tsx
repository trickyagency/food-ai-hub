import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import { 
  User, 
  Phone, 
  Clock, 
  FileText, 
  Printer,
  CheckCircle2,
  XCircle,
  ChefHat,
  Loader2,
  MessageSquare,
  History,
  ChevronDown,
  MapPin,
  Package
} from "lucide-react";
import { format } from "date-fns";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { OrderReceiptPrint } from "./OrderReceiptPrint";
import { OrderStatusTimeline } from "./OrderStatusTimeline";
import { Order } from "@/hooks/useOrders";
import { useOrderHistory } from "@/hooks/useOrderHistory";
import { toast } from "sonner";

interface OrderDetailDialogEnhancedProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdate: (orderId: string, status: string) => Promise<boolean>;
}

export const OrderDetailDialogEnhanced = ({
  order,
  open,
  onOpenChange,
  onStatusUpdate
}: OrderDetailDialogEnhancedProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  
  const { history, loading: historyLoading } = useOrderHistory(order?.id || null);

  if (!order) return null;

  const items = Array.isArray(order.items) ? order.items : [];

  const handleStatusUpdate = async (newStatus: string) => {
    if (newStatus === 'cancelled') {
      setPendingStatus(newStatus);
      setShowCancelConfirm(true);
      return;
    }
    
    await performStatusUpdate(newStatus);
  };

  const performStatusUpdate = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      const success = await onStatusUpdate(order.id, newStatus);
      if (success) {
        toast.success(`Order status updated to ${newStatus}`);
      }
    } finally {
      setIsUpdating(false);
      setPendingStatus(null);
    }
  };

  const confirmCancel = async () => {
    setShowCancelConfirm(false);
    if (pendingStatus) {
      await performStatusUpdate(pendingStatus);
    }
  };

  const statusActions = [
    { status: 'confirmed', label: 'Confirmed', icon: Clock, color: 'bg-warning text-warning-foreground' },
    { status: 'preparing', label: 'Preparing', icon: ChefHat, color: 'bg-blue-500 text-white' },
    { status: 'completed', label: 'Completed', icon: CheckCircle2, color: 'bg-success text-white' },
    { status: 'cancelled', label: 'Cancel', icon: XCircle, color: 'bg-destructive text-destructive-foreground' },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold">
                Order Details
              </DialogTitle>
              <OrderStatusBadge status={order.status || "confirmed"} />
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Customer Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <User className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p className="font-medium">{order.customer_name || "Unknown"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-medium">{order.customer_number}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Order Time</p>
                  <p className="font-medium">
                    {order.created_at 
                      ? format(new Date(order.created_at), "MMM dd, yyyy HH:mm")
                      : "N/A"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                {order.order_type === 'delivery' ? (
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Package className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Order Type</p>
                  <p className="font-medium capitalize">{order.order_type || 'Pickup'}</p>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            {order.order_type === 'delivery' && order.delivery_address && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <MapPin className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Delivery Address</p>
                  <p className="font-medium">{order.delivery_address}</p>
                </div>
              </div>
            )}

            <Separator />

            {/* Order Items */}
            <div>
              <h3 className="font-semibold mb-3">Order Items</h3>
              <div className="space-y-2">
                {items.length > 0 ? items.map((item: any, index: number) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{item.name || "Item"}</p>
                      {item.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="font-normal">
                        x{item.quantity || 1}
                      </Badge>
                      <span className="font-semibold w-20 text-right">
                        ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )) : (
                  <p className="text-muted-foreground text-center py-4">No items</p>
                )}
              </div>
            </div>

            {/* Special Instructions */}
            {order.special_instructions && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Special Instructions
                  </h3>
                  <p className="text-sm bg-warning/10 text-warning-foreground p-3 rounded-lg border border-warning/30">
                    {order.special_instructions}
                  </p>
                </div>
              </>
            )}

            <Separator />

            {/* Order Summary */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${(order.subtotal || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>${(order.tax || 0).toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">${order.total.toFixed(2)}</span>
              </div>
            </div>

            <Separator />

            {/* Order History Timeline */}
            <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                  <h3 className="font-semibold flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Order History
                    {history.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {history.length}
                      </Badge>
                    )}
                  </h3>
                  <ChevronDown 
                    className={`w-4 h-4 text-muted-foreground transition-transform ${historyOpen ? 'rotate-180' : ''}`} 
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <OrderStatusTimeline history={history} loading={historyLoading} />
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Status Actions */}
            <div>
              <h3 className="font-semibold mb-3">Update Status</h3>
              <div className="flex flex-wrap gap-2">
                {statusActions.map((action) => {
                  const Icon = action.icon;
                  const isCurrentStatus = order.status === action.status;
                  const isLoading = isUpdating && pendingStatus === action.status;
                  
                  return (
                    <Button
                      key={action.status}
                      variant={isCurrentStatus ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleStatusUpdate(action.status)}
                      disabled={isUpdating || isCurrentStatus}
                      className={`gap-2 ${isCurrentStatus ? action.color : ''}`}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                      {action.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" />
                Print Receipt
              </Button>
              <Button variant="secondary" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this order for {order.customer_name || "this customer"}? 
              This action cannot be undone and the customer will need to place a new order.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingStatus(null)}>
              Keep Order
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hidden Print Content */}
      <OrderReceiptPrint ref={printRef} order={order as any} />
    </>
  );
};
