import DashboardLayout from "@/components/DashboardLayout";
import { OrderAnalytics } from "@/components/orders/OrderAnalytics";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { ShoppingCart } from "lucide-react";

const Orders = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Orders Management</h1>
          </div>
          <p className="text-muted-foreground">
            View, track, and manage all orders placed through voice calls
          </p>
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
