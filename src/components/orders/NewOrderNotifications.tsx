import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { 
  ShoppingCart, 
  CheckCircle2, 
  ChefHat, 
  XCircle,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface OrderPayload {
  id: string;
  customer_name: string | null;
  customer_number: string;
  items: any;
  total: number;
  status: string | null;
  created_at: string | null;
}

const statusLabels: Record<string, string> = {
  confirmed: "Confirmed",
  preparing: "Preparing",
  completed: "Completed",
  cancelled: "Cancelled"
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "confirmed": return Clock;
    case "preparing": return ChefHat;
    case "completed": return CheckCircle2;
    case "cancelled": return XCircle;
    default: return ShoppingCart;
  }
};

export const NewOrderNotifications = () => {
  const { canViewReports } = useUserRole();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastNotifiedOrderId = useRef<string | null>(null);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio();
    // Use a simple beep sound (base64 encoded)
    audioRef.current.src = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleWE5F0+f2N2sWxYFP5ra2apUEAE8ltfYpk0LAjqR0tOjRgcCN4zN0J9BBAEzh8nMnDwAAC+DxsmaOQAAK37Dxpc2AAAneb/DlDMAACV2vMGSMQAAI3O5v5AvAAAhcLe9jy0AAB9utryNKwAAHWy0uoopAAAba7K4iCcAABlpsbaGJQAAF2ewsoQjAAAVZK6ygCEAABRirq9+HwAAEmCsrXwdAAAQXqqreh0AAA9cqKl4GwAADlqmqHYaAAANWaSmdBoAAAxYoqR0GAAAClahonMXAAAJVJ+hcRYAAAdSnaFwFQAABlGcn28UAAEFUJqebhMAAQRPmZ1tEwABBE6Xm2wSAAEDTZaabBIAAQJMlZlrEQABAkuUmGsRAAECS5OYahEAAQFKk5hqEQABAUmSmWoRAAEASZGYahAAAQBIkJlqEAABAEeQmGoPAAEAR4+YahAAAQBGj5dqDwABAEaPl2oPAAEARY6XaQ8AAQBFjpdpDwABAESNlmoPAAEARY2Wag8AAQBEjZZpDgABAAA=";
    audioRef.current.volume = 0.5;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.log);
    }
  }, []);

  const showNotification = useCallback((
    title: string,
    description: string,
    orderId: string,
    isNew = true
  ) => {
    // Prevent duplicate notifications for same order
    if (lastNotifiedOrderId.current === orderId) return;
    lastNotifiedOrderId.current = orderId;

    if (isNew) {
      playNotificationSound();
    }

    toast(title, {
      description,
      duration: 10000,
      action: {
        label: "View Order",
        onClick: () => navigate("/orders")
      }
    });

    // Request desktop notification permission and show
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { 
        body: description,
        icon: "/favicon.ico",
        tag: orderId
      });
    }
  }, [navigate, playNotificationSound]);

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!canViewReports) return;

    const channel = supabase
      .channel("orders-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const order = payload.new as OrderPayload;
          const itemCount = Array.isArray(order.items) ? order.items.length : 0;
          
          showNotification(
            `🆕 New Order Received!`,
            `${order.customer_name || "Customer"} - ${itemCount} item${itemCount !== 1 ? "s" : ""} - $${order.total.toFixed(2)}`,
            order.id,
            true
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          const oldOrder = payload.old as OrderPayload;
          const newOrder = payload.new as OrderPayload;
          
          // Only notify if status changed
          if (oldOrder.status !== newOrder.status) {
            const StatusIcon = getStatusIcon(newOrder.status || "confirmed");
            const statusLabel = statusLabels[newOrder.status || "confirmed"] || newOrder.status;
            
            showNotification(
              `Order Status Updated`,
              `${newOrder.customer_name || "Order"}: ${statusLabels[oldOrder.status || "confirmed"]} → ${statusLabel}`,
              newOrder.id,
              false
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [canViewReports, showNotification]);

  return null;
};
