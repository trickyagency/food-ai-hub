import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { OrderAnalytics } from "@/components/orders/OrderAnalytics";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { OrderExport } from "@/components/orders/OrderExport";
import { ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

interface Order {
  id: string;
  customer_name: string | null;
  customer_number: string;
  items: Json;
  subtotal: number | null;
  tax: number | null;
  total: number;
  status: string | null;
  special_instructions: string | null;
  estimated_time: number | null;
  call_id: string;
  created_at: string | null;
  updated_at: string | null;
}

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const fetchOrders = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setOrders(data);
    };
    fetchOrders();

    const channel = supabase
      .channel("orders-export")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, fetchOrders)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Orders Management</h1>
            </div>
            <p className="text-muted-foreground">
              View, track, and manage all orders placed through voice calls
            </p>
          </div>
          <OrderExport orders={orders} />
        </div>

        {/* Analytics Section */}
        <OrderAnalytics />

        {/* Orders Table */}
        <OrdersTable />
      </div>
    </DashboardLayout>
  );
};

export default Orders;
