import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { ShoppingBag, ChefHat, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Json } from "@/integrations/supabase/types";

interface OrderPayload {
  id: string;
  customer_name: string | null;
  customer_number: string;
  items: Json;
  total: number;
  status: string | null;
  created_at: string | null;
}

const statusLabels: Record<string, string> = {
  confirmed: "Confirmed",
  preparing: "Preparing",
  completed: "Completed",
  cancelled: "Cancelled",
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "preparing":
      return <ChefHat className="h-4 w-4 text-amber-500" />;
    case "completed":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "cancelled":
      return <XCircle className="h-4 w-4 text-destructive" />;
    default:
      return <ShoppingBag className="h-4 w-4 text-primary" />;
  }
};

export function OrderNotifications() {
  const { toast } = useToast();
  const { canViewReports, loading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !canViewReports) return;

    const channel = supabase
      .channel("order-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          const order = payload.new as OrderPayload;
          const items = Array.isArray(order.items) ? order.items : [];
          const itemCount = items.length;

          toast({
            title: "New Order!",
            description: (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-primary" />
                  <span className="font-medium">
                    {order.customer_name || order.customer_number}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {itemCount} item{itemCount !== 1 ? "s" : ""} • ${Number(order.total).toFixed(2)}
                </span>
              </div>
            ),
            action: (
              <button
                onClick={() => navigate("/orders")}
                className="text-xs font-medium text-primary hover:underline"
              >
                View Order
              </button>
            ),
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          const oldOrder = payload.old as OrderPayload;
          const newOrder = payload.new as OrderPayload;

          // Only notify if status has changed
          if (oldOrder.status === newOrder.status) return;

          const oldStatus = statusLabels[oldOrder.status || "confirmed"] || oldOrder.status;
          const newStatus = statusLabels[newOrder.status || "confirmed"] || newOrder.status;

          let title = "Order Status Updated";
          let variant: "default" | "destructive" = "default";

          if (newOrder.status === "preparing") {
            title = "Order Being Prepared";
          } else if (newOrder.status === "completed") {
            title = "Order Ready!";
          } else if (newOrder.status === "cancelled") {
            title = "Order Cancelled";
            variant = "destructive";
          }

          toast({
            title,
            variant,
            description: (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  {getStatusIcon(newOrder.status || "confirmed")}
                  <span className="font-medium">
                    {newOrder.customer_name || newOrder.customer_number}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {oldStatus} → {newStatus} • ${Number(newOrder.total).toFixed(2)}
                </span>
              </div>
            ),
            action: (
              <button
                onClick={() => navigate("/orders")}
                className="text-xs font-medium text-primary hover:underline"
              >
                View Order
              </button>
            ),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loading, canViewReports, toast, navigate]);

  return null;
}

export default OrderNotifications;
