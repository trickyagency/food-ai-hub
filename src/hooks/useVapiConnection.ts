import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useVapiConnection = () => {
  const [testing, setTesting] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  const testConnection = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("vapi-proxy", {
        body: { endpoint: "/call?limit=1" },
      });

      if (error) {
        console.error("Connection test failed:", error);
        setIsConnected(false);
        toast.error("Connection failed: " + error.message);
        return false;
      }

      if (data?.error) {
        console.error("Vapi API error:", data.error);
        setIsConnected(false);
        toast.error("Vapi API error: " + data.error);
        return false;
      }

      setIsConnected(true);
      toast.success("Successfully connected to Vapi API");
      return true;
    } catch (err) {
      console.error("Connection test error:", err);
      setIsConnected(false);
      toast.error("Connection test failed");
      return false;
    } finally {
      setTesting(false);
    }
  };

  return {
    testConnection,
    testing,
    isConnected,
  };
};
