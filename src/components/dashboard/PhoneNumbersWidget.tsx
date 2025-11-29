import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useVapiPhoneNumbers } from "@/hooks/useVapiPhoneNumbers";
import { Phone, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const PhoneNumbersWidget = () => {
  const { phoneNumbers, loading, error } = useVapiPhoneNumbers();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Phone Numbers
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
            <Phone className="w-5 h-5" />
            Phone Numbers
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
          <Phone className="w-5 h-5" />
          Phone Numbers
        </CardTitle>
        <CardDescription>Your Vapi phone numbers</CardDescription>
      </CardHeader>
      <CardContent>
        {phoneNumbers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No phone numbers configured</p>
        ) : (
          <div className="space-y-3">
            {phoneNumbers.map((phoneNumber) => (
              <div key={phoneNumber.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex-1">
                  <p className="font-medium text-sm">{phoneNumber.name || phoneNumber.number}</p>
                  <p className="text-xs text-muted-foreground">{phoneNumber.number}</p>
                </div>
                <Phone className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
