import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useVapiAssistants } from "@/hooks/useVapiAssistants";
import { useVapiPhoneNumbers } from "@/hooks/useVapiPhoneNumbers";
import { Bot, Loader2, Phone } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export const AssistantsWidget = () => {
  const { assistants, loading, error } = useVapiAssistants();
  const { twilioPhoneNumber } = useVapiPhoneNumbers();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            AI Assistants
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

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            AI Assistants
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          AI Assistants
        </CardTitle>
        <CardDescription>Your configured voice AI assistants</CardDescription>
      </CardHeader>
      <CardContent>
        {assistants.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assistants found</p>
        ) : (
          <div className="space-y-3">
            {assistants.map((assistant) => {
              const isLinkedToPhone = twilioPhoneNumber?.assistantId === assistant.id;
              return (
                <div key={assistant.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{assistant.name || "Unnamed Assistant"}</p>
                      {isLinkedToPhone && (
                        <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                          <Phone className="w-3 h-3 mr-1" />
                          {twilioPhoneNumber?.number}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{assistant.id}</p>
                  </div>
                  <Bot className="w-4 h-4 text-muted-foreground" />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
