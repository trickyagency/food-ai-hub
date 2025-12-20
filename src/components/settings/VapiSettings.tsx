import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useVapiConnection } from "@/hooks/useVapiConnection";
import { CheckCircle2, XCircle, Loader2, Phone } from "lucide-react";
import { InboundCallConfig } from "@/components/dashboard/InboundCallConfig";
const VapiSettings = () => {
  const {
    testConnection,
    testing,
    isConnected
  } = useVapiConnection();
  return <div className="space-y-6">
      {/* Phone Configuration Section */}
      <InboundCallConfig />
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Phone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Voice AI Connection</CardTitle>
              <CardDescription>
                Manage your Voice AI service integration
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border/50">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Connection Status</p>
                <p className="text-xs text-muted-foreground">
                  Test your connection to the AI service
                </p>
              </div>
              <div className="flex items-center gap-3">
                {isConnected === null ? <Badge variant="outline" className="gap-2">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                    Not Tested
                  </Badge> : isConnected ? <Badge variant="default" className="gap-2 bg-green-500 hover:bg-green-600">
                    <CheckCircle2 className="w-3 h-3" />
                    Connected
                  </Badge> : <Badge variant="destructive" className="gap-2">
                    <XCircle className="w-3 h-3" />
                    Disconnected
                  </Badge>}
                <Button onClick={testConnection} disabled={testing} size="sm" variant="outline">
                  {testing ? <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Testing...
                    </> : "Test Connection"}
                </Button>
              </div>
            </div>

            

            <div className="space-y-2">
              
              
            </div>
          </div>
        </CardContent>
      </Card>
    </div>;
};
export default VapiSettings;