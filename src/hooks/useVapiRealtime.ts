import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

interface VapiCallEvent {
  id: string;
  call_id: string;
  event_type: string;
  payload: any;
  call_status?: string;
  transcript_text?: string;
  created_at: string;
}

export const useVapiRealtime = () => {
  const [latestEvent, setLatestEvent] = useState<VapiCallEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let channel: RealtimeChannel;

    const setupRealtime = async () => {
      console.log("Setting up Vapi realtime subscription...");

      channel = supabase
        .channel("vapi-call-events")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "vapi_call_events",
          },
          (payload) => {
            console.log("Received realtime event:", payload);
            setLatestEvent(payload.new as VapiCallEvent);
          }
        )
        .subscribe((status) => {
          console.log("Realtime subscription status:", status);
          setIsConnected(status === "SUBSCRIBED");
        });
    };

    setupRealtime();

    return () => {
      if (channel) {
        console.log("Cleaning up Vapi realtime subscription");
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return {
    latestEvent,
    isConnected,
  };
};
