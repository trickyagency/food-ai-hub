import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useVapiAssistants } from "@/hooks/useVapiAssistants";
import { useVapiPhoneNumbers } from "@/hooks/useVapiPhoneNumbers";

export const MakeCallDialog = () => {
  const [open, setOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedAssistant, setSelectedAssistant] = useState("");
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { assistants, loading: assistantsLoading } = useVapiAssistants();
  const { phoneNumbers, loading: phoneNumbersLoading } = useVapiPhoneNumbers();

  const handleMakeCall = async () => {
    if (!phoneNumber || !selectedAssistant) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    try {
      console.log("Initiating outbound call...", { phoneNumber, selectedAssistant, selectedPhoneNumber });

      const { data, error } = await supabase.functions.invoke("vapi-proxy", {
        body: {
          endpoint: "/call",
          method: "POST",
          assistantId: selectedAssistant,
          ...(selectedPhoneNumber && selectedPhoneNumber !== "default" && { phoneNumberId: selectedPhoneNumber }),
          customer: {
            number: phoneNumber,
          },
        },
      });

      if (error) {
        console.error("Failed to initiate call:", error);
        toast.error("Failed to initiate call: " + error.message);
        return;
      }

      if (data?.error) {
        console.error("Vapi API error:", data);
        toast.error("Vapi API error: " + (data.details || data.error));
        return;
      }

      console.log("Call initiated successfully:", data);
      toast.success("Call initiated successfully!");
      setOpen(false);
      setPhoneNumber("");
      setSelectedAssistant("");
      setSelectedPhoneNumber("");
    } catch (err) {
      console.error("Error initiating call:", err);
      toast.error("Failed to initiate call");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Phone className="w-4 h-4" />
          Make Call
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Initiate Outbound Call</DialogTitle>
          <DialogDescription>
            Start a call using your AI voice assistant
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Customer Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1234567890"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assistant">Select Assistant *</Label>
            <Select value={selectedAssistant} onValueChange={setSelectedAssistant} disabled={isLoading || assistantsLoading}>
              <SelectTrigger>
                <SelectValue placeholder={assistantsLoading ? "Loading assistants..." : "Choose an assistant"} />
              </SelectTrigger>
              <SelectContent>
                {assistants.map((assistant) => (
                  <SelectItem key={assistant.id} value={assistant.id}>
                    {assistant.name || assistant.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="outbound-number">Outbound Phone Number (Optional)</Label>
            <Select value={selectedPhoneNumber} onValueChange={setSelectedPhoneNumber} disabled={isLoading || phoneNumbersLoading}>
              <SelectTrigger>
                <SelectValue placeholder={phoneNumbersLoading ? "Loading numbers..." : "Use default or select"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Use Default</SelectItem>
                {phoneNumbers.map((number) => (
                  <SelectItem key={number.id} value={number.id}>
                    {number.name || number.number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleMakeCall} disabled={isLoading || !phoneNumber || !selectedAssistant}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Calling...
              </>
            ) : (
              <>
                <Phone className="w-4 h-4 mr-2" />
                Start Call
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
