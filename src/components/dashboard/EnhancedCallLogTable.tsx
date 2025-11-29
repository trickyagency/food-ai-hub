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
      <Card className="bg-gradient-card border-border/50 shadow-elegant">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-primary" />
            Recent Calls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockCalls.map((call) => (
              <div
                key={call.id}
                className="flex flex-col gap-3 p-4 rounded-lg bg-card border border-border hover:border-primary/30 transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-foreground mb-2">{call.customer}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {call.phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {call.duration}
                      </span>
                      <span className="flex items-center gap-1 md:col-span-2">
                        <MapPin className="w-3 h-3" />
                        {call.address}
                      </span>
                      <span>{call.timestamp}</span>
                    </div>
                  </div>
                  <Badge className={getStatusColor(call.status)}>
                    {getStatusIcon(call.status)}
                    <span className="ml-1 capitalize">{call.status}</span>
                  </Badge>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCall(call)}
                  className="w-full md:w-auto self-start"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  View Conversation
                </Button>
              </div>
            ))}
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
