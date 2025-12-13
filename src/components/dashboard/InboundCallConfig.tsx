import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useVapiAssistants } from "@/hooks/useVapiAssistants";
import { useVapiPhoneNumbers } from "@/hooks/useVapiPhoneNumbers";
import { Phone, Bot, MessageSquare, PhoneIncoming, PhoneOutgoing, CheckCircle2, Loader2 } from "lucide-react";

export const InboundCallConfig = () => {
  const { assistants, loading: assistantsLoading } = useVapiAssistants();
  const { twilioPhoneNumber, loading: phoneLoading } = useVapiPhoneNumbers();

  const loading = assistantsLoading || phoneLoading;

  // Get the primary assistant (the one linked to the phone number)
  const linkedAssistant = assistants.find(a => a.id === twilioPhoneNumber?.assistantId) || assistants[0];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Phone Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="w-5 h-5 text-primary" />
          Phone Configuration
        </CardTitle>
        <CardDescription>
          Your business phone number and AI assistant configuration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Phone Number Display */}
        <div className="p-4 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Business Phone Number</p>
              <p className="text-2xl font-bold tracking-wide">
                {twilioPhoneNumber?.number || "+14697503114"}
              </p>
              <p className="text-sm text-muted-foreground">
                {twilioPhoneNumber?.name || "Food Business"}
              </p>
            </div>
            <Badge variant="default" className="bg-green-500 hover:bg-green-600">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Active
            </Badge>
          </div>
        </div>

        {/* Linked Assistant */}
        <div className="p-4 rounded-lg border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">AI Assistant</p>
              <p className="font-semibold">{linkedAssistant?.name || "AI Assistant"}</p>
            </div>
            <Badge variant="outline" className="border-primary text-primary">
              Linked
            </Badge>
          </div>
        </div>

        {/* Capabilities */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
            <div className="flex items-center gap-2 mb-1">
              <PhoneIncoming className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium text-green-700 dark:text-green-300">Inbound Calls</span>
            </div>
            <p className="text-xs text-green-600 dark:text-green-400">✓ Enabled</p>
          </div>
          <div className="p-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
            <div className="flex items-center gap-2 mb-1">
              <PhoneOutgoing className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium text-green-700 dark:text-green-300">Outbound Calls</span>
            </div>
            <p className="text-xs text-green-600 dark:text-green-400">✓ Enabled</p>
          </div>
          <div className="p-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium text-green-700 dark:text-green-300">SMS</span>
            </div>
            <p className="text-xs text-green-600 dark:text-green-400">✓ Enabled</p>
          </div>
        </div>

        {/* Help Text */}
        <p className="text-xs text-muted-foreground text-center">
          Customers calling this number will be connected to your AI assistant automatically.
        </p>
      </CardContent>
    </Card>
  );
};
