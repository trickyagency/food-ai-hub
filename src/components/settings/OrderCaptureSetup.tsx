import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, XCircle, Settings, Copy, ExternalLink, RefreshCw, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AssistantInfo {
  id: string;
  name: string;
  model: string;
}

interface ToolInfo {
  id: string;
  type: string;
  functionName?: string;
}

export const OrderCaptureSetup = () => {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [assistants, setAssistants] = useState<AssistantInfo[]>([]);
  const [selectedAssistant, setSelectedAssistant] = useState<string | null>(null);
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [hasCaptureOrder, setHasCaptureOrder] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);

  const webhookUrl = "https://undppzthskqsikywqvwn.supabase.co/functions/v1/vapi-webhook";

  useEffect(() => {
    fetchAssistants();
  }, []);

  const fetchAssistants = async () => {
    try {
      const { data, error } = await supabase
        .from("vapi_assistants_cache")
        .select("id, name, model");

      if (error) throw error;
      
      const formattedAssistants = data?.map(a => ({
        id: a.id,
        name: a.name || "Unnamed Assistant",
        model: typeof a.model === 'object' && a.model !== null 
          ? (a.model as any).model || "Unknown" 
          : "Unknown"
      })) || [];
      
      setAssistants(formattedAssistants);
      
      if (formattedAssistants.length > 0 && !selectedAssistant) {
        setSelectedAssistant(formattedAssistants[0].id);
        checkAssistantTools(formattedAssistants[0].id);
      }
    } catch (error) {
      console.error("Error fetching assistants:", error);
    }
  };

  const checkAssistantTools = async (assistantId: string) => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("vapi-assistant-info", {
        body: { assistantId },
      });

      if (error) throw error;

      const toolList = data.tools || [];
      setTools(toolList);
      
      // Check if capture_order function exists
      const hasCapture = toolList.some(
        (t: ToolInfo) => t.type === "function" && t.functionName === "capture_order"
      );
      setHasCaptureOrder(hasCapture);
    } catch (error: any) {
      console.error("Error checking tools:", error);
      toast.error("Failed to check assistant configuration");
    } finally {
      setChecking(false);
    }
  };

  const setupCaptureOrder = async () => {
    if (!selectedAssistant) return;
    
    setSetupLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("vapi-create-order-tool", {
        body: { assistantId: selectedAssistant },
      });

      if (error) throw error;

      toast.success("Order capture tool created successfully!");
      setHasCaptureOrder(true);
      
      // Refresh the tools list
      checkAssistantTools(selectedAssistant);
    } catch (error: any) {
      console.error("Error setting up capture_order:", error);
      toast.error(error.message || "Failed to setup order capture");
    } finally {
      setSetupLoading(false);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success("Webhook URL copied to clipboard");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Order Capture Setup
        </CardTitle>
        <CardDescription>
          Configure your Vapi assistant to capture customer orders during calls
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Assistant Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Assistant</label>
          <div className="flex gap-2">
            <select
              className="flex-1 px-3 py-2 border rounded-md bg-background"
              value={selectedAssistant || ""}
              onChange={(e) => {
                setSelectedAssistant(e.target.value);
                checkAssistantTools(e.target.value);
              }}
            >
              {assistants.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.model})
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => selectedAssistant && checkAssistantTools(selectedAssistant)}
              disabled={checking}
            >
              <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Status Check */}
        {selectedAssistant && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {hasCaptureOrder ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <div>
                  <p className="font-medium">capture_order Function</p>
                  <p className="text-sm text-muted-foreground">
                    {hasCaptureOrder
                      ? "Configured - Orders will be captured during calls"
                      : "Not configured - Orders won't be captured"}
                  </p>
                </div>
              </div>
              {!hasCaptureOrder && (
                <Button onClick={setupCaptureOrder} disabled={setupLoading}>
                  {setupLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <Settings className="h-4 w-4 mr-2" />
                      Setup Now
                    </>
                  )}
                </Button>
              )}
              {hasCaptureOrder && (
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                  Active
                </Badge>
              )}
            </div>

            {/* Tools List */}
            {tools.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Current Tools</p>
                <div className="space-y-1">
                  {tools.map((tool) => (
                    <div
                      key={tool.id}
                      className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded"
                    >
                      <span className="font-mono text-xs">{tool.id}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{tool.type}</Badge>
                        {tool.functionName && (
                          <Badge 
                            variant={tool.functionName === "capture_order" ? "default" : "outline"}
                          >
                            {tool.functionName}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Webhook URL Section */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Webhook URL</label>
          <Alert>
            <AlertDescription className="space-y-3">
              <p className="text-sm">
                Make sure this URL is set as the <strong>Server URL</strong> in your Vapi assistant settings:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted p-2 rounded overflow-x-auto">
                  {webhookUrl}
                </code>
                <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="link" className="p-0 h-auto" asChild>
                <a
                  href="https://dashboard.vapi.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open Vapi Dashboard <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            </AlertDescription>
          </Alert>
        </div>

        {/* Instructions */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">How it works:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>When a customer places an order during a call, your AI assistant calls the <code>capture_order</code> function</li>
            <li>The order is saved to your database and appears in Order Management</li>
            <li>An SMS confirmation is automatically sent to the customer's phone</li>
            <li>The order status can be updated from the Orders page</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};
