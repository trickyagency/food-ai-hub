import DashboardLayout from "@/components/DashboardLayout";
import { PageTransition } from "@/components/PageTransition";
import { MessageSquare, TrendingUp } from "lucide-react";
import SmsAnalytics from "@/components/sms-history/SmsAnalytics";
import SmsHistoryTable from "@/components/sms-history/SmsHistoryTable";

const SmsHistory = () => {
  return (
    <DashboardLayout>
      <PageTransition>
        <div className="p-6 sm:p-8 lg:p-10 space-y-8 max-w-[1800px] mx-auto">
          {/* Header */}
          <div className="space-y-3 pb-6 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-sm">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">SMS History</h1>
                <p className="text-base text-muted-foreground">Track all order confirmation SMS messages with delivery status</p>
              </div>
            </div>
          </div>

          {/* Analytics Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">SMS Analytics</h2>
            </div>
            <SmsAnalytics />
          </div>

          {/* History Table */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Message History</h2>
            </div>
            <SmsHistoryTable />
          </div>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
};

export default SmsHistory;
