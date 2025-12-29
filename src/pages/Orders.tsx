import { useState, useMemo, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { OrderAnalyticsEnhanced } from "@/components/orders/OrderAnalyticsEnhanced";
import { OrdersTableEnhanced } from "@/components/orders/OrdersTableEnhanced";
import { OrderExportEnhanced } from "@/components/orders/OrderExportEnhanced";
import { NewOrderNotifications } from "@/components/orders/NewOrderNotifications";
import { TestOrderButton } from "@/components/orders/TestOrderButton";
import { ShoppingCart } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOrders } from "@/hooks/useOrders";
import { useAuth } from "@/contexts/AuthContext";
import { DateRange } from "react-day-picker";

const Orders = () => {
  const { user } = useAuth();
  const { role } = useUserRole();
  const { 
    orders, 
    stats, 
    loading, 
    lastUpdated, 
    refreshOrders, 
    updateOrderStatus 
  } = useOrders({ enableRealtime: true });
  
  const isAdminOrOwner = role === "admin" || role === "owner";

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Wrap updateOrderStatus to include user info for history logging
  const handleStatusUpdate = useCallback(async (orderId: string, status: string) => {
    return updateOrderStatus(orderId, status, {
      userId: user?.id,
      userEmail: user?.email
    });
  }, [updateOrderStatus, user]);

  // Compute filtered orders for export
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = 
          (order.customer_name?.toLowerCase().includes(searchLower)) ||
          order.customer_number.includes(searchQuery) ||
          order.id.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      if (statusFilter !== "all" && order.status !== statusFilter) {
        return false;
      }

      if (dateRange?.from && order.created_at) {
        const orderDate = new Date(order.created_at);
        if (orderDate < dateRange.from) return false;
        if (dateRange.to) {
          const endOfDay = new Date(dateRange.to);
          endOfDay.setHours(23, 59, 59, 999);
          if (orderDate > endOfDay) return false;
        }
      }

      return true;
    });
  }, [orders, searchQuery, statusFilter, dateRange]);

  return (
    <DashboardLayout>
      <NewOrderNotifications />
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Orders Management</h1>
                <p className="text-sm text-muted-foreground">
                  View, track, and manage all orders placed through voice calls
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {stats && stats.todayOrders > 0 && (
              <Badge variant="secondary" className="gap-1">
                {stats.todayOrders} today
              </Badge>
            )}
            {isAdminOrOwner && <TestOrderButton />}
            <OrderExportEnhanced 
              orders={orders} 
              filteredOrders={filteredOrders.length !== orders.length ? filteredOrders : undefined} 
            />
          </div>
        </div>

        {/* Analytics Section */}
        <OrderAnalyticsEnhanced stats={stats} loading={loading} />

        {/* Orders Table */}
        <OrdersTableEnhanced
          orders={orders}
          loading={loading}
          onStatusUpdate={handleStatusUpdate}
          onRefresh={refreshOrders}
          lastUpdated={lastUpdated}
        />
      </div>
    </DashboardLayout>
  );
};

export default Orders;
