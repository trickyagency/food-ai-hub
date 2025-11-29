import { useState, useEffect } from "react";
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
import { z } from "zod";

const phoneNumberSchema = z.string()
  .trim()
  .regex(/^\+[1-9]\d{1,14}$/, "Phone number must be in international format")
  .min(8, "Phone number is too short")
  .max(16, "Phone number is too long");

interface CountryCode {
  code: string;
  country: string;
  flag: string;
  format: string;
  maxLength: number;
}

const countryCodes: CountryCode[] = [
  { code: "+1", country: "US/Canada", flag: "🇺🇸", format: "(XXX) XXX-XXXX", maxLength: 10 },
  { code: "+44", country: "UK", flag: "🇬🇧", format: "XXXX XXX XXXX", maxLength: 10 },
  { code: "+91", country: "India", flag: "🇮🇳", format: "XXXXX XXXXX", maxLength: 10 },
  { code: "+61", country: "Australia", flag: "🇦🇺", format: "XXX XXX XXX", maxLength: 9 },
  { code: "+81", country: "Japan", flag: "🇯🇵", format: "XX XXXX XXXX", maxLength: 10 },
  { code: "+86", country: "China", flag: "🇨🇳", format: "XXX XXXX XXXX", maxLength: 11 },
  { code: "+49", country: "Germany", flag: "🇩🇪", format: "XXX XXXXXXXX", maxLength: 11 },
  { code: "+33", country: "France", flag: "🇫🇷", format: "X XX XX XX XX", maxLength: 9 },
  { code: "+39", country: "Italy", flag: "🇮🇹", format: "XXX XXX XXXX", maxLength: 10 },
  { code: "+34", country: "Spain", flag: "🇪🇸", format: "XXX XX XX XX", maxLength: 9 },
  { code: "+7", country: "Russia", flag: "🇷🇺", format: "XXX XXX-XX-XX", maxLength: 10 },
  { code: "+55", country: "Brazil", flag: "🇧🇷", format: "XX XXXXX-XXXX", maxLength: 11 },
  { code: "+52", country: "Mexico", flag: "🇲🇽", format: "XX XXXX XXXX", maxLength: 10 },
  { code: "+27", country: "South Africa", flag: "🇿🇦", format: "XX XXX XXXX", maxLength: 9 },
  { code: "+971", country: "UAE", flag: "🇦🇪", format: "XX XXX XXXX", maxLength: 9 },
];

const formatPhoneNumber = (value: string, countryCode: CountryCode): string => {
  // Remove all non-numeric characters
  const numbers = value.replace(/\D/g, "");
  
  // Apply formatting based on country
  if (countryCode.code === "+1") {
    // US/Canada format: (XXX) XXX-XXXX
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
  } else if (countryCode.code === "+44") {
    // UK format: XXXX XXX XXXX
    if (numbers.length <= 4) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 4)} ${numbers.slice(4)}`;
    return `${numbers.slice(0, 4)} ${numbers.slice(4, 7)} ${numbers.slice(7, 11)}`;
  } else {
    // Generic formatting: add space every 3-4 digits
    return numbers.replace(/(\d{3,4})(?=\d)/g, "$1 ").trim();
  }
};

export const MakeCallDialog = () => {
  const [open, setOpen] = useState(false);
  const [countryCode, setCountryCode] = useState(countryCodes[0]); // Default to US
  const [localNumber, setLocalNumber] = useState("");
  const [formattedNumber, setFormattedNumber] = useState("");
  const [selectedAssistant, setSelectedAssistant] = useState("");
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const { assistants, loading: assistantsLoading } = useVapiAssistants();
  const { phoneNumbers, loading: phoneNumbersLoading } = useVapiPhoneNumbers();

  // Auto-format phone number as user types
  useEffect(() => {
    const formatted = formatPhoneNumber(localNumber, countryCode);
    setFormattedNumber(formatted);
  }, [localNumber, countryCode]);

  const handleLocalNumberChange = (value: string) => {
    // Remove all non-numeric characters
    const numbersOnly = value.replace(/\D/g, "");
    
    // Limit to max length for selected country
    if (numbersOnly.length <= countryCode.maxLength) {
      setLocalNumber(numbersOnly);
      setPhoneError(null);
    }
  };

  const getFullPhoneNumber = (): string => {
    return `${countryCode.code}${localNumber}`;
  };

  const handleMakeCall = async () => {
    const fullPhoneNumber = getFullPhoneNumber();
    
    if (!localNumber || !selectedAssistant) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate phone number format
    const validation = phoneNumberSchema.safeParse(fullPhoneNumber);
    if (!validation.success) {
      const errorMessage = validation.error.errors[0]?.message || "Invalid phone number format";
      setPhoneError(errorMessage);
      toast.error(errorMessage);
      return;
    }

    setPhoneError(null);
    setIsLoading(true);
    try {
      const fullPhoneNumber = getFullPhoneNumber();
      console.log("Initiating outbound call...", { phoneNumber: fullPhoneNumber, selectedAssistant, selectedPhoneNumber });

      const { data, error } = await supabase.functions.invoke("vapi-proxy", {
        body: {
          endpoint: "/call",
          method: "POST",
          assistantId: selectedAssistant,
          ...(selectedPhoneNumber && selectedPhoneNumber !== "default" && { phoneNumberId: selectedPhoneNumber }),
          customer: {
            number: fullPhoneNumber,
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
      setLocalNumber("");
      setFormattedNumber("");
      setCountryCode(countryCodes[0]);
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
            
            <div className="flex gap-2">
              <Select 
                value={countryCode.code} 
                onValueChange={(value) => {
                  const selected = countryCodes.find(c => c.code === value);
                  if (selected) {
                    setCountryCode(selected);
                    setLocalNumber("");
                    setPhoneError(null);
                  }
                }}
                disabled={isLoading}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] bg-popover">
                  {countryCodes.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      <span className="flex items-center gap-2">
                        <span>{country.flag}</span>
                        <span className="font-mono">{country.code}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex-1">
                <Input
                  id="phone"
                  type="tel"
                  placeholder={countryCode.format.replace(/X/g, "0")}
                  value={formattedNumber}
                  onChange={(e) => handleLocalNumberChange(e.target.value)}
                  disabled={isLoading}
                  className={phoneError ? "border-destructive" : ""}
                />
              </div>
            </div>

            {phoneError && (
              <p className="text-sm text-destructive">{phoneError}</p>
            )}
            
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Format: {countryCode.format}
              </p>
              {localNumber && (
                <p className="text-xs font-mono text-primary">
                  Full number: {getFullPhoneNumber()}
                </p>
              )}
            </div>
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
          <Button onClick={handleMakeCall} disabled={isLoading || !localNumber || !selectedAssistant}>
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
