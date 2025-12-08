import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { ShoppingBag } from "lucide-react";
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loading, canViewReports, toast, navigate]);

  return null;
}

export default OrderNotifications;
