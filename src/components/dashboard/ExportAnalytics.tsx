import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Download, FileText, FileSpreadsheet, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { VapiCall } from "@/hooks/useVapiCalls";
import { VapiAnalytics } from "@/hooks/useVapiAnalytics";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import { toast } from "sonner";

interface ExportAnalyticsProps {
  calls: VapiCall[];
  analytics: VapiAnalytics;
}

export const ExportAnalytics = ({ calls, analytics }: ExportAnalyticsProps) => {
  const [open, setOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "excel">("pdf");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (exportFormat === "pdf") {
        await exportPDF();
      } else {
        await exportExcel();
      }
      toast.success(`Report exported successfully as ${exportFormat.toUpperCase()}`);
      setOpen(false);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export report");
    } finally {
      setIsExporting(false);
    }
  };

  const getFilteredCalls = () => {
    if (!dateRange?.from || !dateRange?.to) return calls;
    return calls.filter((call) => {
      const callDate = new Date(call.createdAt);
      return callDate >= dateRange.from! && callDate <= dateRange.to!;
    });
  };

  const exportPDF = async () => {
    const pdf = new jsPDF();
    const filteredCalls = getFilteredCalls();
    
    // Title
    pdf.setFontSize(20);
    pdf.text("Voice AI Call Analytics Report", 20, 20);
    
    // Date Range
    pdf.setFontSize(12);
    const dateRangeText = dateRange?.from && dateRange?.to
      ? `${format(dateRange.from, "MMM dd, yyyy")} - ${format(dateRange.to, "MMM dd, yyyy")}`
      : "All Time";
    pdf.text(`Period: ${dateRangeText}`, 20, 30);
    pdf.text(`Generated: ${format(new Date(), "PPpp")}`, 20, 37);

    // Summary Section
    pdf.setFontSize(16);
    pdf.text("Summary", 20, 50);
    pdf.setFontSize(12);
    
    let yPos = 60;
    const summaryData = [
      ["Total Calls", filteredCalls.length.toString()],
      ["Total Minutes", analytics.totalMinutes.toFixed(1)],
      ["Total Cost", `$${analytics.totalCost.toFixed(2)}`],
      ["Success Rate", `${analytics.successRate.toFixed(1)}%`],
      ["Completed Calls", analytics.callsByStatus.completed.toString()],
      ["Failed Calls", analytics.callsByStatus.failed.toString()],
      ["Ongoing Calls", analytics.callsByStatus.ongoing.toString()],
    ];

    summaryData.forEach(([label, value]) => {
      pdf.text(`${label}: ${value}`, 30, yPos);
      yPos += 7;
    });

    // Call Type Distribution
    yPos += 10;
    pdf.setFontSize(16);
    pdf.text("Call Distribution", 20, yPos);
    yPos += 10;
    pdf.setFontSize(12);
    pdf.text(`Inbound: ${analytics.callsByType.inbound}`, 30, yPos);
    pdf.text(`Outbound: ${analytics.callsByType.outbound}`, 100, yPos);
    pdf.text(`Web: ${analytics.callsByType.web}`, 160, yPos);

    // Cost Breakdown
    yPos += 15;
    pdf.setFontSize(16);
    pdf.text("Cost Breakdown", 20, yPos);
    yPos += 10;
    pdf.setFontSize(12);
    const costData = [
      ["Speech-to-Text", `$${analytics.costBreakdown.stt.toFixed(2)}`],
      ["LLM", `$${analytics.costBreakdown.llm.toFixed(2)}`],
      ["Text-to-Speech", `$${analytics.costBreakdown.tts.toFixed(2)}`],
      ["Vapi Platform", `$${analytics.costBreakdown.vapi.toFixed(2)}`],
      ["Transport", `$${analytics.costBreakdown.transport.toFixed(2)}`],
    ];

    costData.forEach(([label, value]) => {
      pdf.text(`${label}: ${value}`, 30, yPos);
      yPos += 7;
    });

    // Recent Calls Table
    if (yPos > 240) {
      pdf.addPage();
      yPos = 20;
    } else {
      yPos += 15;
    }
    
    pdf.setFontSize(16);
    pdf.text("Recent Calls", 20, yPos);
    yPos += 10;
    pdf.setFontSize(10);

    // Table headers
    pdf.text("Date", 20, yPos);
    pdf.text("Type", 55, yPos);
    pdf.text("Duration", 85, yPos);
    pdf.text("Cost", 120, yPos);
    pdf.text("Status", 150, yPos);
    yPos += 7;

    // Table rows (limit to 20 most recent)
    filteredCalls.slice(0, 20).forEach((call) => {
      if (yPos > 280) {
        pdf.addPage();
        yPos = 20;
      }

      const dateStr = format(new Date(call.createdAt), "MM/dd HH:mm");
      const typeStr = call.type.replace("PhoneCall", "").replace("Call", "");
      const durationStr = call.duration
        ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s`
        : "N/A";
      const costStr = `$${(call.cost || 0).toFixed(3)}`;
      const statusStr = call.status;

      pdf.text(dateStr, 20, yPos);
      pdf.text(typeStr, 55, yPos);
      pdf.text(durationStr, 85, yPos);
      pdf.text(costStr, 120, yPos);
      pdf.text(statusStr, 150, yPos);
      yPos += 6;
    });

    // Save PDF
    const filename = `voice-ai-analytics-${format(new Date(), "yyyy-MM-dd")}.pdf`;
    pdf.save(filename);
  };

  const exportExcel = () => {
    const filteredCalls = getFilteredCalls();
    
    // Summary sheet
    const summaryData = [
      ["Voice AI Call Analytics Report"],
      [""],
      ["Period", dateRange?.from && dateRange?.to
        ? `${format(dateRange.from, "MMM dd, yyyy")} - ${format(dateRange.to, "MMM dd, yyyy")}`
        : "All Time"],
      ["Generated", format(new Date(), "PPpp")],
      [""],
      ["SUMMARY"],
      ["Total Calls", filteredCalls.length],
      ["Total Minutes", analytics.totalMinutes.toFixed(1)],
      ["Total Cost", `$${analytics.totalCost.toFixed(2)}`],
      ["Success Rate", `${analytics.successRate.toFixed(1)}%`],
      ["Completed Calls", analytics.callsByStatus.completed],
      ["Failed Calls", analytics.callsByStatus.failed],
      ["Ongoing Calls", analytics.callsByStatus.ongoing],
      [""],
      ["CALL DISTRIBUTION"],
      ["Inbound Calls", analytics.callsByType.inbound],
      ["Outbound Calls", analytics.callsByType.outbound],
      ["Web Calls", analytics.callsByType.web],
      [""],
      ["COST BREAKDOWN"],
      ["Speech-to-Text", `$${analytics.costBreakdown.stt.toFixed(2)}`],
      ["LLM", `$${analytics.costBreakdown.llm.toFixed(2)}`],
      ["Text-to-Speech", `$${analytics.costBreakdown.tts.toFixed(2)}`],
      ["Vapi Platform", `$${analytics.costBreakdown.vapi.toFixed(2)}`],
      ["Transport", `$${analytics.costBreakdown.transport.toFixed(2)}`],
    ];

    // Call details sheet
    const callDetailsData = [
      ["Date & Time", "Call Type", "Phone Number", "Duration (sec)", "Cost ($)", "Status", "Ended Reason"],
      ...filteredCalls.map((call) => [
        format(new Date(call.createdAt), "yyyy-MM-dd HH:mm:ss"),
        call.type,
        call.customer?.number || call.phoneNumber?.number || "N/A",
        call.duration || 0,
        (call.cost || 0).toFixed(4),
        call.status,
        call.endedReason || "N/A",
      ]),
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");
    
    const detailsWs = XLSX.utils.aoa_to_sheet(callDetailsData);
    XLSX.utils.book_append_sheet(wb, detailsWs, "Call Details");

    // Set column widths
    summaryWs["!cols"] = [{ wch: 25 }, { wch: 25 }];
    detailsWs["!cols"] = [
      { wch: 20 },
      { wch: 20 },
      { wch: 18 },
      { wch: 15 },
      { wch: 12 },
      { wch: 15 },
      { wch: 20 },
    ];

    // Save Excel file
    const filename = `voice-ai-analytics-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Export Analytics</span>
          <span className="sm:hidden">Export</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Analytics Report</DialogTitle>
          <DialogDescription>
            Download a comprehensive report with charts, summaries, and call metrics
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label>Export Format</Label>
            <RadioGroup value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="pdf" id="pdf" />
                <label htmlFor="pdf" className="flex items-center gap-2 flex-1 cursor-pointer">
                  <FileText className="w-4 h-4 text-primary" />
                  <div>
                    <p className="font-medium">PDF Report</p>
                    <p className="text-xs text-muted-foreground">
                      Professional formatted document
                    </p>
                  </div>
                </label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="excel" id="excel" />
                <label htmlFor="excel" className="flex items-center gap-2 flex-1 cursor-pointer">
                  <FileSpreadsheet className="w-4 h-4 text-primary" />
                  <div>
                    <p className="font-medium">Excel Spreadsheet</p>
                    <p className="text-xs text-muted-foreground">
                      Detailed data with multiple sheets
                    </p>
                  </div>
                </label>
              </div>
            </RadioGroup>
          </div>

          {/* Date Range Selection */}
          <div className="space-y-3">
            <Label>Date Range (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>All time</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            {dateRange && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDateRange(undefined)}
                className="w-full"
              >
                Clear date range
              </Button>
            )}
          </div>

          {/* Export Button */}
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating {exportFormat.toUpperCase()}...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export as {exportFormat.toUpperCase()}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
