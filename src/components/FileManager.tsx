import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Trash2, FileText, Database, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { auditLog } from "@/lib/auditLog";

interface FileRecord {
  id: string;
  file_name: string | null;
  size: number | null;
  mime_type: string | null;
  storage_path: string;
  created_at: string | null;
  user_id: string;
}

const FileManager = () => {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase
        .from("files")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error("Error fetching files:", error);
      toast.error("Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (file: FileRecord) => {
    try {
      const { data, error } = await supabase.storage
        .from("database-files")
        .download(file.storage_path);

      if (error) throw error;

      // Create download link
      const url = window.URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.file_name || "download";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Downloaded ${file.file_name}`);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Failed to download file");
    }
  };

  const handleDelete = async (file: FileRecord) => {
    if (!confirm(`Are you sure you want to delete ${file.file_name}?`)) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("database-files")
        .remove([file.storage_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("files")
        .delete()
        .eq("id", file.id);

      if (dbError) throw dbError;

      // Log audit event
      await auditLog.fileDeleted(file.file_name || "Unnamed file", file.id);

      setFiles(files.filter((f) => f.id !== file.id));
      toast.success(`Deleted ${file.file_name}`);
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Failed to delete file");
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Unknown date";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <Card className="bg-gradient-card border-border/50 shadow-elegant">
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading files...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-border/50 shadow-elegant">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          Database Files
        </CardTitle>
        <CardDescription>
          Manage vector database files uploaded to the system
        </CardDescription>
      </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12" />
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">No files uploaded yet</p>
              <p className="text-sm">
                Upload your first database file to get started
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border hover:border-primary/30 transition-all duration-200"
              >
                <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {file.file_name || "Unnamed file"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)} • {formatDate(file.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDownload(file)}
                    className="hover:bg-primary/10 hover:text-primary"
                    title="Download file"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(file)}
                    className="hover:bg-destructive/10 hover:text-destructive"
                    title="Delete file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FileManager;
