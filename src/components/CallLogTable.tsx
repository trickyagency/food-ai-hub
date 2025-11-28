import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Clock, CheckCircle2, XCircle } from "lucide-react";

interface CallLog {
  id: string;
  customer: string;
  phone: string;
  duration: string;
  status: "completed" | "failed" | "ongoing";
  timestamp: string;
}

const mockCalls: CallLog[] = [
  { id: "1", customer: "Mario's Pizzeria", phone: "+1 (555) 0123", duration: "3:42", status: "completed", timestamp: "2 hours ago" },
  { id: "2", customer: "Sushi Haven", phone: "+1 (555) 0124", duration: "2:15", status: "completed", timestamp: "3 hours ago" },
  { id: "3", customer: "Burger Palace", phone: "+1 (555) 0125", duration: "1:20", status: "failed", timestamp: "5 hours ago" },
  { id: "4", customer: "Taco Express", phone: "+1 (555) 0126", duration: "4:05", status: "completed", timestamp: "6 hours ago" },
];

const CallLogTable = () => {
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
    <Card className="bg-gradient-card border-border/50 shadow-elegant">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Phone className="w-5 h-5 text-primary" />
          Recent Calls
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {mockCalls.map((call) => (
            <div
              key={call.id}
              className="flex items-center justify-between p-4 rounded-lg bg-card border border-border hover:border-primary/30 transition-all duration-200"
            >
              <div className="flex-1">
                <p className="font-medium text-foreground mb-1">{call.customer}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {call.phone}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {call.duration}
                  </span>
                  <span>{call.timestamp}</span>
                </div>
              </div>
              <Badge className={getStatusColor(call.status)}>
                {getStatusIcon(call.status)}
                <span className="ml-1 capitalize">{call.status}</span>
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CallLogTable;
