import { forwardRef } from "react";
import { format } from "date-fns";
import { Tables } from "@/integrations/supabase/types";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  modifications?: string[];
}

interface OrderReceiptPrintProps {
  order: Tables<"orders">;
}

export const OrderReceiptPrint = forwardRef<HTMLDivElement, OrderReceiptPrintProps>(
  ({ order }, ref) => {
    const items = (order.items as unknown as OrderItem[]) || [];

    return (
      <div ref={ref} className="print-receipt hidden print:block">
        <style>
          {`
            @media print {
              body * {
                visibility: hidden;
              }
              .print-receipt,
              .print-receipt * {
                visibility: visible;
              }
              .print-receipt {
                position: absolute;
                left: 0;
                top: 0;
                width: 80mm;
                padding: 10px;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                line-height: 1.4;
                color: black;
                background: white;
              }
            }
          `}
        </style>

        {/* Header */}
        <div className="text-center border-b-2 border-dashed border-black pb-2 mb-2">
          <div className="text-lg font-bold">KITCHEN TICKET</div>
          <div className="text-sm">Order #{order.id.slice(0, 8).toUpperCase()}</div>
        </div>

        {/* Timestamp */}
        <div className="text-center text-sm mb-2">
          {order.created_at
            ? format(new Date(order.created_at), "MMM d, yyyy h:mm a")
            : "Unknown Date"}
        </div>

        {/* Customer Info */}
        <div className="border-b border-dashed border-black pb-2 mb-2">
          <div className="font-bold">Customer:</div>
          <div>{order.customer_name || "Unknown"}</div>
          <div>Tel: {order.customer_number}</div>
        </div>

        {/* Items */}
        <div className="border-b border-dashed border-black pb-2 mb-2">
          <div className="font-bold mb-1">ITEMS:</div>
          <div className="border-t border-dashed border-black pt-1">
            {items.map((item, index) => (
              <div key={index} className="mb-2">
                <div className="flex justify-between">
                  <span className="font-bold">
                    {item.quantity}x {item.name}
                  </span>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
                {item.modifications && item.modifications.length > 0 && (
                  <div className="text-xs pl-4">
                    {item.modifications.map((mod, modIdx) => (
                      <div key={modIdx}>• {mod}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Special Instructions */}
        {order.special_instructions && (
          <div className="border-b border-dashed border-black pb-2 mb-2">
            <div className="font-bold">⚠️ SPECIAL INSTRUCTIONS:</div>
            <div className="text-sm pl-2 pt-1">{order.special_instructions}</div>
          </div>
        )}

        {/* Totals */}
        <div className="border-b border-dashed border-black pb-2 mb-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>${Number(order.subtotal || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Tax:</span>
            <span>${Number(order.tax || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-base border-t border-black pt-1 mt-1">
            <span>TOTAL:</span>
            <span>${Number(order.total).toFixed(2)}</span>
          </div>
        </div>

        {/* Estimated Time */}
        <div className="text-center font-bold mb-2">
          Est. Time: {order.estimated_time || 30} minutes
        </div>

        {/* Footer */}
        <div className="text-center text-xs border-t border-dashed border-black pt-2">
          <div>Order ID: {order.id}</div>
          <div>Call ID: {order.call_id.slice(0, 12)}...</div>
        </div>
      </div>
    );
  }
);

OrderReceiptPrint.displayName = "OrderReceiptPrint";
