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
    timestamp: new Date(Date.now() - 36 * 60 * 60 * 1000),
    conversation: [
      "AI: Hello! Confirming your order details.",
      "Customer: Perfect timing, we just got the order ready.",
    ]
  },
];

interface ProfessionalCallTableProps {
  dateRange?: DateRange;
}

const ProfessionalCallTable = ({ dateRange }: ProfessionalCallTableProps) => {
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);

  const filteredCalls = dateRange?.from && dateRange?.to
    ? allCalls.filter(call => {
        const callDate = call.timestamp;
        return callDate >= dateRange.from! && callDate <= dateRange.to!;
      })
    : allCalls;

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success/10 text-success border border-success/20";
      case "failed":
        return "bg-destructive/10 text-destructive border border-destructive/20";
      case "ongoing":
        return "bg-warning/10 text-warning border border-warning/20";
      default:
        return "bg-muted text-muted-foreground border border-border";
    }
  };

  return (
    <>
      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border bg-muted/30">
          <CardTitle className="text-xl font-bold text-foreground">Recent Calls</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            View detailed call logs and conversations
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left text-sm font-semibold text-foreground px-6 py-4">
                    Customer
                  </th>
                  <th className="text-left text-sm font-semibold text-foreground px-6 py-4">
                    Phone
                  </th>
                  <th className="text-left text-sm font-semibold text-foreground px-6 py-4">
                    Location
                  </th>
                  <th className="text-left text-sm font-semibold text-foreground px-6 py-4">
                    Duration
                  </th>
                  <th className="text-left text-sm font-semibold text-foreground px-6 py-4">
                    Status
                  </th>
                  <th className="text-left text-sm font-semibold text-foreground px-6 py-4">
                    Time
                  </th>
                  <th className="text-right text-sm font-semibold text-foreground px-6 py-4">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCalls.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-muted-foreground">
                      No calls found in the selected date range
                    </td>
                  </tr>
                ) : (
                  filteredCalls.map((call) => (
                    <tr
                      key={call.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-foreground">
                          {call.customer}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          {call.phone}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          {call.address}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {call.duration}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-semibold ${getStatusStyle(call.status)}`}>
                          {call.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-muted-foreground">
                          {formatTime(call.timestamp)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedCall(call)}
                          className="hover:bg-primary/10 hover:text-primary"
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
            <DialogTitle className="text-2xl">Call Details</DialogTitle>
          </DialogHeader>
          
          {selectedCall && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 p-6 bg-muted/30 rounded-xl border border-border">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Customer</p>
                  <p className="text-base font-semibold text-foreground">{selectedCall.customer}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Phone</p>
                  <p className="text-base font-semibold text-foreground">{selectedCall.phone}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Duration</p>
                  <p className="text-base font-semibold text-foreground">{selectedCall.duration}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Status</p>
                  <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-semibold ${getStatusStyle(selectedCall.status)}`}>
                    {selectedCall.status}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-base font-bold text-foreground">Conversation</h4>
                <div className="space-y-3">
                  {selectedCall.conversation.map((message, index) => {
                    const isAI = message.startsWith("AI:");
                    return (
                      <div
                        key={index}
                        className={`p-4 rounded-xl ${
                          isAI 
                            ? "bg-primary/5 border border-primary/10" 
                            : "bg-muted/50 border border-border"
                        }`}
                      >
                        <p className="text-xs font-bold text-muted-foreground mb-2">
                          {isAI ? "AI Agent" : "Customer"}
                        </p>
                        <p className="text-sm text-foreground leading-relaxed">
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