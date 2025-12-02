import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useVapiAssistants } from "@/hooks/useVapiAssistants";
import { toast } from "sonner";
import { Loader2, Database, Plus, Trash2, CheckCircle2, XCircle, RefreshCw, FileText, Unlink } from "lucide-react";

interface VapiFile {
  id: string;
  vapi_file_id: string | null;
  local_file_id: string;
  file_name: string;
  status: string;
  vapi_url: string | null;
  error_message: string | null;
}

interface KnowledgeBase {
  id: string;
  vapi_kb_id: string | null;
  name: string;
  assistant_id: string | null;
  file_ids: string[];
  created_at: string;
  updated_at: string;
}

const KnowledgeBaseManager = () => {
  const [files, setFiles] = useState<VapiFile[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [selectedAssistant, setSelectedAssistant] = useState("");
  const [syncing, setSyncing] = useState(false);
  const { assistants } = useVapiAssistants();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch Vapi files
      const { data: filesData, error: filesError } = await supabase
        .from("vapi_files")
        .select("*")
        .order("created_at", { ascending: false });

      if (filesError) throw filesError;
      setFiles(filesData || []);

      // Fetch knowledge bases
      const { data: kbData, error: kbError } = await supabase
        .from("vapi_knowledge_bases")
        .select("*")
        .order("created_at", { ascending: false });

      if (kbError) throw kbError;
      setKnowledgeBases(kbData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const assignFilesToAssistant = async () => {
    if (!selectedAssistant) {
      toast.error("Please select an assistant");
      return;
    }

    if (selectedFiles.length === 0) {
      toast.error("Please select at least one file");
      return;
    }

    try {
      setSyncing(true);
      
      // Check if KB already exists for this assistant
      const existingKb = knowledgeBases.find(kb => kb.assistant_id === selectedAssistant);
      const assistantName = assistants.find(a => a.id === selectedAssistant)?.name || "Assistant";
      
      let fileIds = selectedFiles;
      
      if (existingKb) {
        // Merge with existing files
        fileIds = [...new Set([...(existingKb.file_ids || []), ...selectedFiles])];
      }

      const { data, error } = await supabase.functions.invoke("vapi-kb-sync", {
        body: {
          knowledgeBaseName: `${assistantName} Knowledge Base`,
          assistantId: selectedAssistant,
          fileIds: fileIds,
        },
      });

      if (error) throw error;

      toast.success(`Files assigned to ${assistantName}`);
      setSelectedFiles([]);
      setSelectedAssistant("");
      fetchData();
    } catch (error: any) {
      console.error("Assignment error:", error);
      toast.error(error.message || "Failed to assign files");
    } finally {
      setSyncing(false);
    }
  };

  const unsyncFile = async (kbId: string, vapiFileId: string, fileName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("vapi-kb-unsync", {
        body: {
          knowledgeBaseId: kbId,
          vapiFileId: vapiFileId,
        },
      });

      if (error) throw error;

      toast.success(`${fileName} removed from knowledge base`);
      fetchData();
    } catch (error: any) {
      console.error("Unsync error:", error);
      toast.error(error.message || "Failed to unsync file");
    }
  };

  // Helper function to get which assistant a file is assigned to
  const getFileAssignment = (vapiFileId: string | null) => {
    if (!vapiFileId) return null;
    const kb = knowledgeBases.find(k => k.file_ids?.includes(vapiFileId));
    if (!kb) return null;
    const assistant = assistants.find(a => a.id === kb.assistant_id);
    return { kb, assistant };
  };

  // Check if file is assigned to any KB
  const isFileAssigned = (vapiFileId: string | null) => {
    if (!vapiFileId) return false;
    return knowledgeBases.some(k => k.file_ids?.includes(vapiFileId));
  };

  const uploadedCount = files.filter(f => f.status === "done").length;
  const assignedCount = files.filter(f => isFileAssigned(f.vapi_file_id)).length;
  const syncedFiles = files.filter(f => f.status === "done" && f.vapi_file_id);

  return (
    <div className="space-y-6">
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Knowledge Base Manager</CardTitle>
              <CardDescription>
                Assign files to assistants - knowledge bases are managed automatically
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{uploadedCount}</p>
                  <p className="text-sm text-muted-foreground mt-1">Files in Vapi</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{assistants.length}</p>
                  <p className="text-sm text-muted-foreground mt-1">Assistants</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{assignedCount}</p>
                  <p className="text-sm text-muted-foreground mt-1">Files Assigned</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : syncedFiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No files synced to Vapi yet</p>
              <p className="text-sm mt-1">Upload files to Database Files section first</p>
            </div>
          ) : (
            <>
              <Card className="border-border/50 bg-muted/30">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex gap-4 items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Select Assistant</Label>
                      <Select value={selectedAssistant} onValueChange={setSelectedAssistant}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an assistant" />
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
                    <Button
                      onClick={assignFilesToAssistant}
                      disabled={!selectedAssistant || selectedFiles.length === 0 || syncing}
                      className="gap-2"
                    >
                      {syncing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Assigning...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Assign Selected Files
                        </>
                      )}
                    </Button>
                  </div>
                  {selectedFiles.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                    </p>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Files ({syncedFiles.length})
                </h3>
                <div className="space-y-2">
                  {syncedFiles.map((file) => {
                    const assignment = getFileAssignment(file.vapi_file_id);
                    const isAssigned = isFileAssigned(file.vapi_file_id);
                    
                    return (
                      <Card key={file.id} className="border-border/50">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
                              <Checkbox
                                checked={selectedFiles.includes(file.local_file_id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedFiles([...selectedFiles, file.local_file_id]);
                                  } else {
                                    setSelectedFiles(selectedFiles.filter(id => id !== file.local_file_id));
                                  }
                                }}
                                className="mt-1"
                              />
                              <div className="flex-1 space-y-2">
                                <div>
                                  <p className="font-medium">{file.file_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {file.vapi_file_id?.substring(0, 20)}...
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Badge variant="default" className="gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Synced to Vapi
                                  </Badge>
                                  {assignment ? (
                                    <Badge variant="secondary" className="gap-1">
                                      📎 Assigned to: {assignment.assistant?.name || "Unknown"}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="gap-1">
                                      ⚪ Not assigned
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            {isAssigned && assignment && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => unsyncFile(assignment.kb.id, file.vapi_file_id!, file.file_name)}
                                className="gap-2 shrink-0"
                              >
                                <Unlink className="w-4 h-4" />
                                Unsync
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>How it works:</strong> Select files using checkboxes, choose an assistant, and click "Assign Selected Files". 
              Knowledge bases are created automatically. Use "Unsync" to remove files without deleting them from Vapi.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KnowledgeBaseManager;
