import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import { invokeWithRetry } from "@/lib/supabaseHelpers";

interface FileSyncButtonProps {
  fileId: string;
  fileName: string;
  onSyncComplete?: () => void;
}

const FileSyncButton = ({ fileId, fileName, onSyncComplete }: FileSyncButtonProps) => {
  const [uploading, setUploading] = useState(false);

  const uploadToVapi = async () => {
    try {
      setUploading(true);
      console.log("Uploading file to Vapi:", fileId);

      const { data, error } = await invokeWithRetry("vapi-file-upload", {
        body: { fileId },
      });

      if (error) throw error;

      toast.success(`${fileName} synced successfully!`);
      console.log("Upload result:", data);
      
      if (onSyncComplete) {
        onSyncComplete();
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to sync file");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={uploadToVapi}
      disabled={uploading}
      className="gap-2"
    >
      {uploading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Uploading...
        </>
      ) : (
        <>
          <Upload className="w-4 h-4" />
          Sync to AI
        </>
      )}
    </Button>
  );
};

export default FileSyncButton;
