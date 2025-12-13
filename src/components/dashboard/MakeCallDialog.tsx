import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Phone, Loader2, Check, ChevronsUpDown, Star, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useVapiAssistants } from "@/hooks/useVapiAssistants";
import { useVapiPhoneNumbers } from "@/hooks/useVapiPhoneNumbers";
import { z } from "zod";
import { cn } from "@/lib/utils";

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

const RECENT_COUNTRIES_KEY = "vapi_recent_country_codes";
const FAVORITE_COUNTRIES_KEY = "vapi_favorite_country_codes";

const getRecentCountries = (): string[] => {
  try {
    const stored = localStorage.getItem(RECENT_COUNTRIES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveRecentCountry = (code: string) => {
  try {
    const recent = getRecentCountries();
    const filtered = recent.filter((c) => c !== code);
    const updated = [code, ...filtered].slice(0, 5); // Keep last 5
    localStorage.setItem(RECENT_COUNTRIES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to save recent country:", error);
  }
};

const getFavoriteCountries = (): string[] => {
  try {
    const stored = localStorage.getItem(FAVORITE_COUNTRIES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const toggleFavoriteCountry = (code: string): boolean => {
  try {
    const favorites = getFavoriteCountries();
    const isFavorite = favorites.includes(code);
    
    if (isFavorite) {
      const updated = favorites.filter((c) => c !== code);
      localStorage.setItem(FAVORITE_COUNTRIES_KEY, JSON.stringify(updated));
      return false;
    } else {
      const updated = [...favorites, code];
      localStorage.setItem(FAVORITE_COUNTRIES_KEY, JSON.stringify(updated));
      return true;
    }
  } catch (error) {
    console.error("Failed to toggle favorite:", error);
    return false;
  }
};

export const MakeCallDialog = () => {
  const [open, setOpen] = useState(false);
  const [countryCode, setCountryCode] = useState(countryCodes[0]); // Default to US
  const [localNumber, setLocalNumber] = useState("");
  const [formattedNumber, setFormattedNumber] = useState("");
  const [selectedAssistant, setSelectedAssistant] = useState("");
  const [selectedPhoneNumberId, setSelectedPhoneNumberId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [recentCountries, setRecentCountries] = useState<string[]>([]);
  const [favoriteCountries, setFavoriteCountries] = useState<string[]>([]);

  const { assistants, loading: assistantsLoading } = useVapiAssistants();
  const { phoneNumbers, loading: phoneNumbersLoading } = useVapiPhoneNumbers();

  // Load recent and favorite countries on mount
  useEffect(() => {
    setRecentCountries(getRecentCountries());
    setFavoriteCountries(getFavoriteCountries());
  }, []);

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

  const handleCountryCodeSelect = (code: string) => {
    const selected = countryCodes.find((c) => c.code === code);
    if (selected) {
      setCountryCode(selected);
      saveRecentCountry(code);
      setRecentCountries(getRecentCountries());
      setLocalNumber("");
      setPhoneError(null);
      setCountryPickerOpen(false);
    }
  };

  const handleToggleFavorite = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavoriteCountry(code);
    setFavoriteCountries(getFavoriteCountries());
  };

  const handleMakeCall = async () => {
    const fullPhoneNumber = getFullPhoneNumber();
    
    if (!localNumber || !selectedAssistant || !selectedPhoneNumberId) {
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
      console.log("Initiating outbound call...", { 
        phoneNumber: fullPhoneNumber, 
        selectedAssistant, 
        phoneNumberId: selectedPhoneNumberId 
      });

      const { data, error } = await supabase.functions.invoke("vapi-proxy", {
        body: {
          endpoint: "/call/phone",
          method: "POST",
          assistantId: selectedAssistant,
          phoneNumberId: selectedPhoneNumberId,
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
      setSelectedPhoneNumberId("");
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
      <DialogContent className="sm:max-w-md w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Initiate Outbound Call</DialogTitle>
          <DialogDescription className="text-sm">
            Start a call using your AI voice assistant
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Customer Phone Number *</Label>
            
            <div className="flex gap-2">
              <Popover open={countryPickerOpen} onOpenChange={setCountryPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={countryPickerOpen}
                    className="w-[160px] justify-between"
                    disabled={isLoading}
                  >
                    <span className="flex items-center gap-2">
                      <span>{countryCode.flag}</span>
                      <span className="font-mono">{countryCode.code}</span>
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0 bg-popover" align="start">
                  <Command className="bg-popover">
                    <CommandInput placeholder="Search country..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>No country found.</CommandEmpty>
                      
                      {favoriteCountries.length > 0 && (
                        <>
                          <CommandGroup heading="Favorites">
                            {favoriteCountries.map((code) => {
                              const country = countryCodes.find((c) => c.code === code);
                              if (!country) return null;
                              return (
                                <CommandItem
                                  key={country.code}
                                  value={`${country.country} ${country.code}`}
                                  onSelect={() => handleCountryCodeSelect(country.code)}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      countryCode.code === country.code ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <span className="flex items-center gap-2 flex-1">
                                    <span>{country.flag}</span>
                                    <span>{country.country}</span>
                                    <span className="font-mono text-muted-foreground">{country.code}</span>
                                  </span>
                                  <Star
                                    className="h-4 w-4 fill-yellow-500 text-yellow-500"
                                    onClick={(e) => handleToggleFavorite(country.code, e)}
                                  />
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                          <CommandSeparator />
                        </>
                      )}
                      
                      {recentCountries.length > 0 && (
                        <>
                          <CommandGroup heading="Recent">
                            {recentCountries
                              .filter((code) => !favoriteCountries.includes(code))
                              .map((code) => {
                                const country = countryCodes.find((c) => c.code === code);
                                if (!country) return null;
                                return (
                                  <CommandItem
                                    key={country.code}
                                    value={`${country.country} ${country.code}`}
                                    onSelect={() => handleCountryCodeSelect(country.code)}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        countryCode.code === country.code ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <span className="flex items-center gap-2 flex-1">
                                      <Clock className="h-3 w-3 text-muted-foreground" />
                                      <span>{country.flag}</span>
                                      <span>{country.country}</span>
                                      <span className="font-mono text-muted-foreground">{country.code}</span>
                                    </span>
                                    <Star
                                      className="h-4 w-4 text-muted-foreground hover:text-yellow-500"
                                      onClick={(e) => handleToggleFavorite(country.code, e)}
                                    />
                                  </CommandItem>
                                );
                              })}
                          </CommandGroup>
                          <CommandSeparator />
                        </>
                      )}
                      
                      <CommandGroup heading="All Countries">
                        {countryCodes.map((country) => (
                          <CommandItem
                            key={country.code}
                            value={`${country.country} ${country.code}`}
                            onSelect={() => handleCountryCodeSelect(country.code)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                countryCode.code === country.code ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="flex items-center gap-2 flex-1">
                              <span>{country.flag}</span>
                              <span>{country.country}</span>
                              <span className="font-mono text-muted-foreground">{country.code}</span>
                            </span>
                            <Star
                              className={cn(
                                "h-4 w-4",
                                favoriteCountries.includes(country.code)
                                  ? "fill-yellow-500 text-yellow-500"
                                  : "text-muted-foreground hover:text-yellow-500"
                              )}
                              onClick={(e) => handleToggleFavorite(country.code, e)}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

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
            <Label htmlFor="phone-number">Call From (Your Phone Number) *</Label>
            <Select value={selectedPhoneNumberId} onValueChange={setSelectedPhoneNumberId} disabled={isLoading || phoneNumbersLoading}>
              <SelectTrigger>
                <SelectValue placeholder={phoneNumbersLoading ? "Loading phone numbers..." : "Choose your outbound number"} />
              </SelectTrigger>
              <SelectContent>
                {phoneNumbers.length === 0 && !phoneNumbersLoading ? (
                  <SelectItem value="none" disabled>
                    No phone numbers found in Vapi
                  </SelectItem>
                ) : (
                  phoneNumbers.map((pn) => (
                    <SelectItem key={pn.id} value={pn.id}>
                      {pn.number} {pn.name ? `(${pn.name})` : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {phoneNumbers.length === 0 && !phoneNumbersLoading && (
              <p className="text-xs text-muted-foreground">
                Import your Twilio number in Vapi Dashboard → Phone Numbers
              </p>
            )}
          </div>

        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleMakeCall} 
            disabled={isLoading || !localNumber || !selectedAssistant || !selectedPhoneNumberId}
          >
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
