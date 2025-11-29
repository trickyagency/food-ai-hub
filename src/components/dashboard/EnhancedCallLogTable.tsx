import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Phone, Clock, CheckCircle2, XCircle, MessageSquare, MapPin, PhoneCall } from "lucide-react";

interface CallLog {
  id: string;
  customer: string;
  phone: string;
  address: string;
  duration: string;
  status: "completed" | "failed" | "ongoing";
  timestamp: string;
  conversation: string[];
}

const mockCalls: CallLog[] = [
  { 
    id: "1", 
    customer: "Mario's Pizzeria", 
    phone: "+1 (555) 0123",
    address: "123 Main St, New York, NY 10001",
    duration: "3:42", 
    status: "completed", 
    timestamp: "2 hours ago",
    conversation: [
      "AI: Hello! This is an automated call from our food delivery service. Is this Mario's Pizzeria?",
      "Customer: Yes, this is Mario's. How can I help you?",
      "AI: We have an order for delivery today at 6 PM. Can you confirm availability?",
      "Customer: Yes, we can handle that. What's the order?",
      "AI: It's a large pepperoni pizza with extra cheese. Total is $24.99.",
      "Customer: Perfect, we'll have it ready by 6 PM.",
      "AI: Thank you for confirming. Have a great day!"
    ]
  },
  { 
    id: "2", 
    customer: "Sushi Haven", 
    phone: "+1 (555) 0124",
    address: "456 Park Ave, New York, NY 10022",
    duration: "2:15", 
    status: "completed", 
    timestamp: "3 hours ago",
    conversation: [
      "AI: Hello! This is an automated call regarding your catering order.",
      "Customer: Yes, I've been waiting for this call.",
      "AI: We have a sushi platter order for 20 people scheduled for tomorrow.",
      "Customer: That's correct. Everything is confirmed on our end.",
      "AI: Excellent! We'll see you tomorrow. Thank you!"
    ]
  },
  { 
    id: "3", 
    customer: "Burger Palace", 
    phone: "+1 (555) 0125",
    address: "789 Broadway, New York, NY 10003",
    duration: "1:20", 
    status: "failed", 
    timestamp: "5 hours ago",
    conversation: [
      "AI: Hello! This is an automated call from food delivery service.",
      "Customer: Sorry, we're closed right now.",
      "AI: I apologize for the inconvenience. When would be a better time to reach you?",
      "Customer: Please call back after 11 AM tomorrow."
    ]
  },
  { 
    id: "4", 
    customer: "Taco Express", 
    phone: "+1 (555) 0126",
    address: "321 5th Ave, New York, NY 10016",
    duration: "4:05", 
    status: "completed", 
    timestamp: "6 hours ago",
    conversation: [
      "AI: Good afternoon! This is a call about bulk order delivery.",
      "Customer: Hi! Yes, we're expecting this call.",
      "AI: We have your order for 50 tacos and sides for a corporate event.",
      "Customer: Yes, that's right. Everything is ready.",
      "AI: Perfect! Our driver will pick up at 5 PM. Thank you!",
      "Customer: Great, see you then!"
    ]
  },
];

const EnhancedCallLogTable = () => {
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);

  const getStatusColor = (status: CallLog["status"]) => {
    switch (status) {
      case "completed": return "bg-success/10 text-success border-success/20";
      case "failed": return "bg-destructive/10 text-destructive border-destructive/20";
      case "ongoing": return "bg-info/10 text-info border-info/20";
    }
  };

  const getStatusIcon = (status: CallLog["status"]) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="w-3 h-3" />;
      case "failed": return <XCircle className="w-3 h-3" />;
      case "ongoing": return <Phone className="w-3 h-3" />;
    }
  };

  return (
    <>
      <Card className="bg-gradient-card border-border/50 shadow-elegant overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
          <CardTitle className="text-foreground flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-primary" />
            Recent Calls
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-full divide-y divide-border">
              {mockCalls.map((call, index) => (
                <div
                  key={call.id}
                  className="group hover:bg-muted/30 transition-all duration-300 animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4 p-4 lg:p-6">
                    {/* Status Badge - Mobile/Desktop */}
                    <div className="flex items-center gap-3 lg:w-32 flex-shrink-0">
                      <Badge className={`${getStatusColor(call.status)} text-xs font-semibold px-3 py-1.5`}>
                        {getStatusIcon(call.status)}
                        <span className="ml-1.5 capitalize">{call.status}</span>
                      </Badge>
                    </div>

                    {/* Customer Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground mb-2 text-base lg:text-lg truncate">
                        {call.customer}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 lg:gap-4 text-xs lg:text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{call.phone}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{call.duration}</span>
                        </span>
                        <span className="flex items-center gap-1.5 sm:col-span-2">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{call.address}</span>
                        </span>
                        <span className="text-xs">{call.timestamp}</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCall(call)}
                        className="w-full lg:w-auto group-hover:border-primary/50 group-hover:bg-primary/5 transition-all duration-300"
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">View Conversation</span>
                        <span className="sm:hidden">View</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedCall} onOpenChange={() => setSelectedCall(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Call Conversation</DialogTitle>
            <DialogDescription>
              {selectedCall && (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Customer:</span>
                    <span>{selectedCall.customer}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3 h-3" />
                    <span>{selectedCall.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3" />
                    <span>{selectedCall.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span>Duration: {selectedCall.duration}</span>
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedCall && (
            <ScrollArea className="max-h-[400px] mt-4">
              <div className="space-y-4 pr-4">
                {selectedCall.conversation.map((message, index) => {
                  const isAI = message.startsWith("AI:");
                  return (
                    <div
                      key={index}
                      className={`p-3 rounded-lg ${
                        isAI 
                          ? "bg-primary/10 ml-8" 
                          : "bg-muted mr-8"
                      }`}
                    >
                      <p className="text-sm font-medium mb-1">
                        {isAI ? "AI Agent" : "Customer"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {message.replace(/^(AI:|Customer:)\s*/, "")}
                      </p>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EnhancedCallLogTable;
