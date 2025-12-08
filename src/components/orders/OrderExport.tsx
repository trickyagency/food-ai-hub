import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
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

interface OrderExportProps {
  orders: Order[];
  filename?: string;
}

export function OrderExport({ orders, filename = "orders-export" }: OrderExportProps) {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const formatItems = (items: Json): string => {
    if (!Array.isArray(items)) return "";
    return items
      .map((item: any) => {
        let str = `${item.quantity || 1}x ${item.name || "Item"}`;
        if (item.modifications?.length) {
          str += ` (${item.modifications.join(", ")})`;
        }
        return str;
      })
      .join("; ");
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleString();
  };

  const prepareData = () => {
    return orders.map((order) => ({
      "Order ID": order.id.slice(0, 8),
      "Customer Name": order.customer_name || "N/A",
      "Phone Number": order.customer_number,
      "Items": formatItems(order.items),
      "Subtotal": order.subtotal ? `$${Number(order.subtotal).toFixed(2)}` : "N/A",
      "Tax": order.tax ? `$${Number(order.tax).toFixed(2)}` : "N/A",
      "Total": `$${Number(order.total).toFixed(2)}`,
      "Status": order.status || "N/A",
      "Special Instructions": order.special_instructions || "",
      "Estimated Time (min)": order.estimated_time || "",
      "Call ID": order.call_id.slice(0, 8),
      "Created At": formatDate(order.created_at),
      "Updated At": formatDate(order.updated_at),
    }));
  };

  const exportCSV = () => {
    setExporting(true);
    try {
      const data = prepareData();
      if (data.length === 0) {
        toast({
          title: "No data to export",
          description: "There are no orders to export.",
          variant: "destructive",
        });
        return;
      }

      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(","),
        ...data.map((row) =>
          headers
            .map((header) => {
              const value = String(row[header as keyof typeof row] || "");
              // Escape quotes and wrap in quotes if contains comma or quote
              if (value.includes(",") || value.includes('"') || value.includes("\n")) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value;
            })
            .join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);

      toast({
        title: "Export successful",
        description: `Exported ${data.length} orders to CSV.`,
      });
    } catch (error) {
      console.error("CSV export error:", error);
      toast({
        title: "Export failed",
        description: "Failed to export orders to CSV.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const exportExcel = () => {
    setExporting(true);
    try {
      const data = prepareData();
      if (data.length === 0) {
        toast({
          title: "No data to export",
          description: "There are no orders to export.",
          variant: "destructive",
        });
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");

      // Auto-size columns
      const maxWidth = 50;
      const colWidths = Object.keys(data[0]).map((key) => ({
        wch: Math.min(
          maxWidth,
          Math.max(
            key.length,
            ...data.map((row) => String(row[key as keyof typeof row] || "").length)
          )
        ),
      }));
      worksheet["!cols"] = colWidths;

      XLSX.writeFile(workbook, `${filename}-${new Date().toISOString().split("T")[0]}.xlsx`);

      toast({
        title: "Export successful",
        description: `Exported ${data.length} orders to Excel.`,
      });
    } catch (error) {
      console.error("Excel export error:", error);
      toast({
        title: "Export failed",
        description: "Failed to export orders to Excel.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={exporting || orders.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportCSV}>
          <FileText className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
