import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

const DEFAULT_ITEMS: OrderItem[] = [
  { name: "Cheeseburger", quantity: 2, price: 8.99 },
  { name: "French Fries", quantity: 1, price: 3.99 },
  { name: "Large Soda", quantity: 2, price: 2.49 },
];

export function TestOrderButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState("Test Customer");
  const [customerNumber, setCustomerNumber] = useState("+15551234567");
  const [orderType, setOrderType] = useState<"pickup" | "delivery">("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("Test order - please ignore");
  const [estimatedTime, setEstimatedTime] = useState(25);
  const [sendSms, setSendSms] = useState(false);
  const [items, setItems] = useState<OrderItem[]>(DEFAULT_ITEMS);

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const handleAddItem = () => {
    setItems([...items, { name: "", quantity: 1, price: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof OrderItem, value: string | number) => {
    const newItems = [...items];
    if (field === "name") {
      newItems[index].name = value as string;
    } else if (field === "quantity") {
      newItems[index].quantity = Math.max(1, Number(value));
    } else if (field === "price") {
      newItems[index].price = Math.max(0, Number(value));
    }
    setItems(newItems);
  };

  const handleSubmit = async () => {
    if (!customerName.trim() || !customerNumber.trim()) {
      toast.error("Customer name and phone number are required");
      return;
    }

    if (items.length === 0 || items.some(item => !item.name.trim())) {
      toast.error("Please add at least one item with a name");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("test-order", {
        body: {
          customer_name: customerName,
          customer_number: customerNumber,
          order_type: orderType,
          delivery_address: orderType === "delivery" ? deliveryAddress : null,
          items: items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
          special_instructions: specialInstructions || null,
          estimated_time: estimatedTime,
          send_sms: sendSms,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast.success(`Test order created successfully!`, {
          description: `Order ID: ${data.order_id?.slice(0, 8)}...`,
        });
        setOpen(false);
        // Reset form
        setCustomerName("Test Customer");
        setCustomerNumber("+15551234567");
        setOrderType("pickup");
        setDeliveryAddress("");
        setSpecialInstructions("Test order - please ignore");
        setEstimatedTime(25);
        setSendSms(false);
        setItems(DEFAULT_ITEMS);
      } else {
        throw new Error(data?.error || "Failed to create test order");
      }
    } catch (error: any) {
      console.error("Test order error:", error);
      toast.error("Failed to create test order", {
        description: error.message || "Unknown error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FlaskConical className="h-4 w-4" />
          Test Order
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            Create Test Order
          </DialogTitle>
          <DialogDescription>
            Simulate an order to verify the capture_order function is working correctly.
            This bypasses Vapi and directly creates an order in the database.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerNumber">Phone Number</Label>
              <Input
                id="customerNumber"
                value={customerNumber}
                onChange={(e) => setCustomerNumber(e.target.value)}
                placeholder="+15551234567"
              />
            </div>
          </div>

          {/* Order Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Order Type</Label>
              <Select value={orderType} onValueChange={(v: "pickup" | "delivery") => setOrderType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pickup">Pickup</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimatedTime">Est. Time (min)</Label>
              <Input
                id="estimatedTime"
                type="number"
                value={estimatedTime}
                onChange={(e) => setEstimatedTime(Number(e.target.value))}
                min={5}
                max={120}
              />
            </div>
          </div>

          {/* Delivery Address */}
          {orderType === "delivery" && (
            <div className="space-y-2">
              <Label htmlFor="deliveryAddress">Delivery Address</Label>
              <Input
                id="deliveryAddress"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="123 Main St, City, State 12345"
              />
            </div>
          )}

          {/* Order Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Order Items</Label>
              <Button type="button" variant="ghost" size="sm" onClick={handleAddItem}>
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                  <Input
                    placeholder="Item name"
                    value={item.name}
                    onChange={(e) => handleItemChange(index, "name", e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                    className="w-16"
                    min={1}
                  />
                  <Input
                    type="number"
                    placeholder="Price"
                    value={item.price}
                    onChange={(e) => handleItemChange(index, "price", e.target.value)}
                    className="w-20"
                    step="0.01"
                    min={0}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveItem(index)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Badge variant="secondary" className="text-sm">
                Total: ${calculateTotal().toFixed(2)}
              </Badge>
            </div>
          </div>

          {/* Special Instructions */}
          <div className="space-y-2">
            <Label htmlFor="specialInstructions">Special Instructions</Label>
            <Textarea
              id="specialInstructions"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Any special requests..."
              rows={2}
            />
          </div>

          {/* SMS Toggle */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
            <div className="space-y-0.5">
              <Label htmlFor="sendSms" className="cursor-pointer">Send SMS Confirmation</Label>
              <p className="text-xs text-muted-foreground">
                Send a confirmation SMS to the customer number (uses Twilio)
              </p>
            </div>
            <Switch
              id="sendSms"
              checked={sendSms}
              onCheckedChange={setSendSms}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Test Order"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
