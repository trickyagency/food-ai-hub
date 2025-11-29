import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";

interface ExportDataProps {
  metrics?: {
    totalCalls: string;
    forwardedCalls: string;
    successRate: string;
    avgDuration: string;
    conversionRate: string;
  };
}

export const ExportData = ({ metrics }: ExportDataProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Header with branding
      pdf.setFillColor(59, 130, 246); // Primary blue
      pdf.rect(0, 0, pageWidth, 40, "F");
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.text("VOICE AI Dashboard", 20, 20);
      pdf.setFontSize(12);
      pdf.text("Food Business Analytics Report", 20, 30);
      
      // Date
      pdf.setFontSize(10);
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 60, 30);
      
      // Metrics section
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(16);
      pdf.text("Performance Metrics", 20, 55);
      
      let yPos = 70;
      const metricsData = [
        { label: "Total Calls", value: metrics?.totalCalls || "1,247" },
        { label: "Forwarded Calls", value: metrics?.forwardedCalls || "342" },
        { label: "Success Rate", value: metrics?.successRate || "94.2%" },
        { label: "Avg. Duration", value: metrics?.avgDuration || "3m 24s" },
        { label: "Conversion Rate", value: metrics?.conversionRate || "67.8%" },
      ];
      
      metricsData.forEach((metric) => {
        pdf.setFontSize(12);
        pdf.text(metric.label, 20, yPos);
        pdf.setFontSize(14);
        pdf.setFont(undefined, "bold");
        pdf.text(metric.value, pageWidth - 80, yPos);
        pdf.setFont(undefined, "normal");
        yPos += 12;
      });
      
      // Try to capture dashboard charts
      const dashboardElement = document.querySelector(".dashboard-content");
      if (dashboardElement) {
        try {
          const canvas = await html2canvas(dashboardElement as HTMLElement, {
            scale: 2,
            logging: false,
            useCORS: true,
          });
          
          const imgData = canvas.toDataURL("image/png");
          const imgWidth = pageWidth - 40;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          if (yPos + imgHeight > pageHeight - 20) {
            pdf.addPage();
            yPos = 20;
          }
          
          pdf.addImage(imgData, "PNG", 20, yPos + 10, imgWidth, Math.min(imgHeight, 150));
        } catch (error) {
          console.error("Error capturing charts:", error);
        }
      }
      
      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text(
        "© 2024 Voice AI - Food Business. All rights reserved.",
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
      
      pdf.save(`voice-ai-analytics-${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("PDF report downloaded successfully");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const exportToCSV = () => {
    try {
      const csvData = [
        ["Metric", "Value", "Date"],
        ["Total Calls", metrics?.totalCalls || "1,247", new Date().toLocaleDateString()],
        ["Forwarded Calls", metrics?.forwardedCalls || "342", new Date().toLocaleDateString()],
        ["Success Rate", metrics?.successRate || "94.2%", new Date().toLocaleDateString()],
        ["Avg. Duration", metrics?.avgDuration || "3m 24s", new Date().toLocaleDateString()],
        ["Conversion Rate", metrics?.conversionRate || "67.8%", new Date().toLocaleDateString()],
      ];

      const csvContent = csvData.map((row) => row.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      link.setAttribute("href", url);
      link.setAttribute("download", `voice-ai-analytics-${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("CSV file downloaded successfully");
    } catch (error) {
      console.error("CSV export error:", error);
      toast.error("Failed to export CSV");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isExporting}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          {isExporting ? "Exporting..." : "Export"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={exportToPDF} className="gap-2 cursor-pointer text-sm">
          <FileText className="w-4 h-4" />
          PDF Report
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToCSV} className="gap-2 cursor-pointer text-sm">
          <FileSpreadsheet className="w-4 h-4" />
          CSV Data
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
