import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Order } from "@/hooks/useOrders";
import * as XLSX from "xlsx";

interface OrderExportEnhancedProps {
  orders: Order[];
  filteredOrders?: Order[];
}

export const OrderExportEnhanced = ({ orders, filteredOrders }: OrderExportEnhancedProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const formatOrdersForExport = (data: Order[]) => {
    return data.map(order => {
      const items = Array.isArray(order.items) ? order.items : [];
      const itemsText = items.map((item: any) => 
        `${item.name || "Item"} x${item.quantity || 1} ($${((item.price || 0) * (item.quantity || 1)).toFixed(2)})`
      ).join("; ");

      return {
        "Order ID": order.id,
        "Customer Name": order.customer_name || "N/A",
        "Customer Phone": order.customer_number,
        "Items": itemsText,
        "Subtotal": order.subtotal?.toFixed(2) || "0.00",
        "Tax": order.tax?.toFixed(2) || "0.00",
        "Total": order.total.toFixed(2),
        "Status": order.status || "confirmed",
        "Special Instructions": order.special_instructions || "",
        "Estimated Time (min)": order.estimated_time || 30,
        "Created At": order.created_at ? format(new Date(order.created_at), "yyyy-MM-dd HH:mm:ss") : "",
        "Updated At": order.updated_at ? format(new Date(order.updated_at), "yyyy-MM-dd HH:mm:ss") : "",
        "Call ID": order.call_id
      };
    });
  };

  const exportToCSV = (data: Order[], filename: string) => {
    setIsExporting(true);
    try {
      const exportData = formatOrdersForExport(data);
      const headers = Object.keys(exportData[0] || {});
      
      const csvContent = [
        headers.join(","),
        ...exportData.map(row => 
          headers.map(header => {
            const value = String(row[header as keyof typeof row] || "");
            // Escape commas and quotes in values
            if (value.includes(",") || value.includes('"') || value.includes("\n")) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(",")
        )
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);

      toast.success(`Exported ${data.length} orders to CSV`);
    } catch (error) {
      console.error("CSV export error:", error);
      toast.error("Failed to export to CSV");
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = (data: Order[], filename: string) => {
    setIsExporting(true);
    try {
      const exportData = formatOrdersForExport(data);
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      
      // Auto-size columns
      const colWidths = Object.keys(exportData[0] || {}).map(key => ({
        wch: Math.max(key.length, 15)
      }));
      worksheet["!cols"] = colWidths;
      
      XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
      XLSX.writeFile(workbook, `${filename}.xlsx`);

      toast.success(`Exported ${data.length} orders to Excel`);
    } catch (error) {
      console.error("Excel export error:", error);
      toast.error("Failed to export to Excel");
    } finally {
      setIsExporting(false);
    }
  };

  const getFilename = (type: string) => {
    const date = format(new Date(), "yyyy-MM-dd_HHmm");
    return `orders_${type}_${date}`;
  };

  const hasFilteredData = filteredOrders && filteredOrders.length !== orders.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting || orders.length === 0}>
          {isExporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {hasFilteredData && (
          <>
            <DropdownMenuLabel className="text-xs">Filtered ({filteredOrders.length})</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => exportToCSV(filteredOrders, getFilename("filtered"))}>
              <FileText className="w-4 h-4 mr-2" />
              Export CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportToExcel(filteredOrders, getFilename("filtered"))}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export Excel
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuLabel className="text-xs">All Orders ({orders.length})</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => exportToCSV(orders, getFilename("all"))}>
          <FileText className="w-4 h-4 mr-2" />
          Export All CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportToExcel(orders, getFilename("all"))}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export All Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
