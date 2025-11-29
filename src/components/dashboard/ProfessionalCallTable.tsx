import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Phone, Clock, MapPin } from "lucide-react";
import { DateRange } from "react-day-picker";

interface CallLog {
  id: string;
  customer: string;
  phone: string;
  address: string;
  duration: string;
  status: "completed" | "failed" | "ongoing";
  timestamp: Date;
  conversation: string[];
}

const allCalls: CallLog[] = [
  { 
    id: "1", 
    customer: "Mario's Pizzeria", 
    phone: "+1 (555) 0123",
    address: "123 Main St, New York, NY",
    duration: "3:42", 
    status: "completed", 
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    conversation: [
      "AI: Hello! This is an automated call from our food delivery service.",
      "Customer: Yes, this is Mario's. How can I help you?",
      "AI: We have an order for delivery today at 6 PM. Can you confirm?",
      "Customer: Yes, we can handle that.",
    ]
  },
  { 
    id: "2", 
    customer: "Sushi Haven", 
    phone: "+1 (555) 0124",
    address: "456 Park Ave, New York, NY",
    duration: "2:15", 
    status: "completed", 
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
    conversation: [
      "AI: Hello! This is regarding your catering order.",
      "Customer: Yes, I've been waiting for this call.",
      "AI: We have a sushi platter for 20 people scheduled.",
    ]
  },
  { 
    id: "3", 
    customer: "Burger Palace", 
    phone: "+1 (555) 0125",
    address: "789 Broadway, New York, NY",
    duration: "1:20", 
    status: "failed", 
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
    conversation: [
      "AI: Hello! This is an automated call.",
      "Customer: Sorry, we're closed right now.",
    ]
  },
  { 
    id: "4", 
    customer: "Taco Express", 
    phone: "+1 (555) 0126",
    address: "321 5th Ave, New York, NY",
    duration: "4:05", 
    status: "completed", 
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    conversation: [
      "AI: Good afternoon! This is about bulk order delivery.",
      "Customer: Hi! Yes, we're expecting this call.",
    ]
  },
  { 
    id: "5", 
    customer: "Pasta House", 
    phone: "+1 (555) 0127",
    address: "555 West St, New York, NY",
    duration: "2:45", 
    status: "completed", 
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
    conversation: [
      "AI: Hello! Confirming your order for tomorrow.",
      "Customer: Yes, everything is ready on our end.",
    ]
  },
];

interface ProfessionalCallTableProps {
  dateRange?: DateRange;
}

const ProfessionalCallTable = ({ dateRange }: ProfessionalCallTableProps) => {
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);

  // Filter calls based on date range
  const filteredCalls = dateRange?.from && dateRange?.to
    ? allCalls.filter(call => {
        const callDate = call.timestamp;
        return callDate >= dateRange.from! && callDate <= dateRange.to!;
      })
    : allCalls;

  const getStatusStyle = (status: CallLog["status"]) => {
    switch (status) {
      case "completed": 
        return "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30";
      case "failed": 
        return "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30";
      case "ongoing": 
        return "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30";
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return "Just now";
  };

  return (
    <>
      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 pb-4">
          <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Recent Calls
          </CardTitle>
          {dateRange?.from && dateRange?.to && (
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Showing {filteredCalls.length} calls in selected range
            </p>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <th className="text-left text-xs font-semibold text-slate-700 dark:text-slate-300 px-6 py-3">
                    Customer
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-700 dark:text-slate-300 px-6 py-3">
                    Phone
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-700 dark:text-slate-300 px-6 py-3">
                    Location
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-700 dark:text-slate-300 px-6 py-3">
                    Duration
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-700 dark:text-slate-300 px-6 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-700 dark:text-slate-300 px-6 py-3">
                    Time
                  </th>
                  <th className="text-right text-xs font-semibold text-slate-700 dark:text-slate-300 px-6 py-3">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredCalls.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                      No calls found in the selected date range
                    </td>
                  </tr>
                ) : (
                  filteredCalls.map((call) => (
                    <tr
                      key={call.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {call.customer}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <Phone className="w-3.5 h-3.5" />
                          {call.phone}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <MapPin className="w-3.5 h-3.5" />
                          {call.address}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          {call.duration}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${getStatusStyle(call.status)}`}>
                          {call.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          {formatTime(call.timestamp)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedCall(call)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedCall} onOpenChange={() => setSelectedCall(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Call Details</DialogTitle>
          </DialogHeader>
          
          {selectedCall && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-md">
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Customer</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedCall.customer}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Phone</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedCall.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Duration</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedCall.duration}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Status</p>
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getStatusStyle(selectedCall.status)}`}>
                    {selectedCall.status}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Conversation</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {selectedCall.conversation.map((message, index) => {
                    const isAI = message.startsWith("AI:");
                    return (
                      <div
                        key={index}
                        className={`p-3 rounded-md ${
                          isAI 
                            ? "bg-slate-100 dark:bg-slate-800" 
                            : "bg-slate-50 dark:bg-slate-900"
                        }`}
                      >
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          {isAI ? "AI Agent" : "Customer"}
                        </p>
                        <p className="text-sm text-slate-900 dark:text-slate-100">
                          {message.replace(/^(AI:|Customer:)\s*/, "")}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProfessionalCallTable;
