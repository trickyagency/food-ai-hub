import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const FAILURE_THRESHOLD = 50; // Alert when failure rate exceeds 50%
const CHECK_INTERVAL = 60000; // Check every 60 seconds
const RECENT_UPLOADS_WINDOW = 10; // Check last 10 uploads

const UploadFailureMonitor = () => {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        setUserRole(data?.role || null);
      }
    };
    fetchUserRole();
  }, [user]);

  useEffect(() => {
    // Only monitor for admins and owners
    if (!userRole || !["admin", "owner"].includes(userRole)) {
      return;
    }

    // Check failure rate immediately on mount
    checkFailureRate();

    // Set up interval to check periodically
    const interval = setInterval(checkFailureRate, CHECK_INTERVAL);

    // Set up real-time listener for new uploads
    const channel = supabase
      .channel("upload-monitoring")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "file_upload_history",
        },
        () => {
          // Check failure rate when new upload is recorded
          checkFailureRate();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "file_upload_history",
        },
        () => {
          // Check failure rate when upload status is updated
          checkFailureRate();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [userRole]);

  const checkFailureRate = async () => {
    try {
      // Fetch recent uploads
      const { data, error } = await supabase
        .from("file_upload_history")
        .select("upload_status")
        .order("created_at", { ascending: false })
        .limit(RECENT_UPLOADS_WINDOW);

      if (error) throw error;

      if (!data || data.length === 0) return;

      const totalUploads = data.length;
      const failedUploads = data.filter((upload) => upload.upload_status === "failed").length;
      const failureRate = (failedUploads / totalUploads) * 100;

      console.log(
        `Upload failure rate check: ${failedUploads}/${totalUploads} (${failureRate.toFixed(1)}%)`
      );

      if (failureRate >= FAILURE_THRESHOLD) {
        toast.error(
          `High upload failure rate detected: ${failureRate.toFixed(1)}% (${failedUploads}/${totalUploads} uploads failed)`,
          {
            icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
            duration: 10000,
            action: {
              label: "View History",
              onClick: () => {
                window.location.href = "/upload-history";
              },
            },
          }
        );
      }
    } catch (error) {
      console.error("Error checking failure rate:", error);
    }
  };

  return null; // This is a background monitoring component
};

export default UploadFailureMonitor;
