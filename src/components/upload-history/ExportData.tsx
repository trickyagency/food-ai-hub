import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportDataProps {
  variant?: "default" | "outline" | "ghost";
}

const ExportData = ({ variant = "outline" }: ExportDataProps) => {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toISOString();
  };

  const exportToCSV = async () => {
    try {
      toast.loading("Preparing CSV export...");

      // Fetch all upload history
      const { data, error } = await supabase
        .from("file_upload_history")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error("No data to export");
        return;
      }

      // Create CSV header
      const headers = [
        "File ID",
        "File Name",
        "File Size (bytes)",
        "MIME Type",
        "Status",
        "Retry Count",
        "Error Message",
        "Created At",
        "Completed At",
      ];

      // Create CSV rows
      const rows = data.map((record) => [
        record.file_id,
        `"${record.file_name}"`, // Wrap in quotes to handle commas
        record.file_size || "",
        record.mime_type || "",
        record.upload_status,
        record.retry_count || 0,
        record.error_message ? `"${record.error_message.replace(/"/g, '""')}"` : "", // Escape quotes
        formatDate(record.created_at),
        formatDate(record.completed_at),
      ]);

      // Combine headers and rows
      const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `upload-history-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success("CSV exported successfully");
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast.dismiss();
      toast.error("Failed to export CSV");
    }
  };

  const exportAnalyticsToCSV = async () => {
    try {
      toast.loading("Preparing analytics export...");

      // Fetch all upload history for analytics
      const { data, error } = await supabase
        .from("file_upload_history")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error("No data to export");
        return;
      }

      // Calculate analytics
      const totalUploads = data.length;
      const successfulUploads = data.filter((d) => d.upload_status === "success").length;
      const failedUploads = data.filter((d) => d.upload_status === "failed").length;
      const pendingUploads = data.filter((d) => d.upload_status === "pending").length;
      const uploadingUploads = data.filter((d) => d.upload_status === "uploading").length;
      const successRate = totalUploads > 0 ? (successfulUploads / totalUploads) * 100 : 0;
      const totalRetries = data.reduce((sum, d) => sum + (d.retry_count || 0), 0);
      const averageRetries = totalUploads > 0 ? totalRetries / totalUploads : 0;

      // Get common errors
      const errorMap = new Map<string, number>();
      data.forEach((d) => {
        if (d.error_message) {
          const error = d.error_message.substring(0, 100);
          errorMap.set(error, (errorMap.get(error) || 0) + 1);
        }
      });

      const commonErrors = Array.from(errorMap.entries())
        .map(([error, count]) => ({ error, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Create analytics CSV
      const analyticsContent = [
        "Upload Analytics Summary",
        `Generated: ${new Date().toISOString()}`,
        "",
        "Metric,Value",
        `Total Uploads,${totalUploads}`,
        `Successful Uploads,${successfulUploads}`,
        `Failed Uploads,${failedUploads}`,
        `Pending Uploads,${pendingUploads}`,
        `Uploading,${uploadingUploads}`,
        `Success Rate,${successRate.toFixed(2)}%`,
        `Average Retries,${averageRetries.toFixed(2)}`,
        "",
        "Common Errors",
        "Error Message,Occurrences",
        ...commonErrors.map((e) => `"${e.error.replace(/"/g, '""')}",${e.count}`),
      ].join("\n");

      // Create blob and download
      const blob = new Blob([analyticsContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `upload-analytics-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success("Analytics exported successfully");
    } catch (error) {
      console.error("Error exporting analytics:", error);
      toast.dismiss();
      toast.error("Failed to export analytics");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export Data
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export Upload History (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAnalyticsToCSV}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export Analytics Summary (CSV)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportData;
