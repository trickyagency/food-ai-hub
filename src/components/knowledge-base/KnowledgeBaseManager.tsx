import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useVapiAssistants } from "@/hooks/useVapiAssistants";
import { toast } from "sonner";
import { Loader2, Database, Upload, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

interface VapiFile {
  id: string;
  vapi_file_id: string | null;
  local_file_id: string;
  file_name: string;
  status: string;
  vapi_url: string | null;
  error_message: string | null;
}

const KnowledgeBaseManager = () => {
  const [files, setFiles] = useState<VapiFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedAssistant, setSelectedAssistant] = useState<string>("");
  const { assistants } = useVapiAssistants();

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("vapi_files")
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

  const syncToKnowledgeBase = async () => {
    if (!selectedAssistant) {
      toast.error("Please select an assistant");
      return;
    }

    const uploadedFiles = files.filter(f => f.status === "done" && f.vapi_file_id);
    if (uploadedFiles.length === 0) {
      toast.error("No uploaded files found. Please upload files to Vapi first.");
      return;
    }

    try {
      setSyncing(true);
      const fileIds = uploadedFiles.map(f => f.local_file_id);

      const { data, error } = await supabase.functions.invoke("vapi-kb-sync", {
        body: {
          knowledgeBaseName: "Database Files Knowledge Base",
          assistantId: selectedAssistant,
          fileIds: fileIds,
        },
      });

      if (error) throw error;

      toast.success("Knowledge base synced successfully!");
      console.log("Knowledge base sync result:", data);
    } catch (error: any) {
      console.error("Knowledge base sync error:", error);
      toast.error(error.message || "Failed to sync knowledge base");
    } finally {
      setSyncing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "done":
        return <Badge variant="default" className="gap-1 bg-green-500"><CheckCircle2 className="w-3 h-3" />Synced</Badge>;
      case "pending":
        return <Badge variant="outline" className="gap-1"><Loader2 className="w-3 h-3 animate-spin" />Pending</Badge>;
      case "failed":
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const uploadedCount = files.filter(f => f.status === "done").length;
  const totalCount = files.length;

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Database className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl">Knowledge Base Manager</CardTitle>
            <CardDescription>
              Sync database files to Vapi assistant's knowledge base
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border border-border/50">
          <div className="flex-1 space-y-2">
            <p className="text-sm font-semibold text-foreground">Select Assistant</p>
            <Select value={selectedAssistant} onValueChange={setSelectedAssistant}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose assistant for knowledge base" />
              </SelectTrigger>
              <SelectContent>
                {assistants.map((assistant) => (
                  <SelectItem key={assistant.id} value={assistant.id}>
                    {assistant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              onClick={syncToKnowledgeBase}
              disabled={syncing || !selectedAssistant || uploadedCount === 0}
              className="gap-2"
            >
              {syncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Sync to Knowledge Base
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              {uploadedCount} of {totalCount} files ready
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Uploaded Files</h3>
            <Button variant="outline" size="sm" onClick={fetchFiles}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Upload className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No files uploaded to Vapi yet</p>
              <p className="text-sm mt-1">Upload files from Database Files section first</p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Vapi File ID</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell className="font-medium">{file.file_name}</TableCell>
                      <TableCell>{getStatusBadge(file.status)}</TableCell>
                      <TableCell>
                        {file.vapi_file_id ? (
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {file.vapi_file_id.substring(0, 16)}...
                          </code>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {file.status === "failed" && file.error_message && (
                          <span className="text-xs text-destructive">{file.error_message}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>How it works:</strong> Upload files from Database Files section, then sync them to your assistant's knowledge base here. 
            The assistant will use these files to answer questions during calls.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default KnowledgeBaseManager;
