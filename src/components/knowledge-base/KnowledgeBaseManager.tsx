import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useVapiAssistants } from "@/hooks/useVapiAssistants";
import { toast } from "sonner";
import { Loader2, Database, CheckCircle2, FileText, Unlink, AlertTriangle, Link2 } from "lucide-react";

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
  const [unsyncDialogOpen, setUnsyncDialogOpen] = useState(false);
  const [fileToUnsync, setFileToUnsync] = useState<{
    kbId: string;
    vapiFileId: string;
    fileName: string;
    assistantName: string;
  } | null>(null);
  const [perFileAssistant, setPerFileAssistant] = useState<Record<string, string>>({});
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
      
      const existingKb = knowledgeBases.find(kb => kb.assistant_id === selectedAssistant);
      const assistantName = assistants.find(a => a.id === selectedAssistant)?.name || "Assistant";
      
      let fileIds = selectedFiles;
      
      if (existingKb) {
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

  const openUnsyncDialog = (kbId: string, vapiFileId: string, fileName: string, assistantName: string) => {
    setFileToUnsync({ kbId, vapiFileId, fileName, assistantName });
    setUnsyncDialogOpen(true);
  };

  const confirmUnsyncFile = async () => {
    if (!fileToUnsync) return;
    
    const { kbId, vapiFileId, fileName } = fileToUnsync;

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
    } finally {
      setUnsyncDialogOpen(false);
      setFileToUnsync(null);
    }
  };

  const syncSingleFile = async (fileId: string, assistantId: string) => {
    if (!assistantId) {
      toast.error("Please select an assistant");
      return;
    }

    setSyncing(true);
    try {
      const assistantName = assistants.find(a => a.id === assistantId)?.name || "Assistant";
      
      const { data, error } = await supabase.functions.invoke("vapi-kb-sync", {
        body: {
          knowledgeBaseName: `${assistantName} Knowledge Base`,
          assistantId: assistantId,
          fileIds: [fileId],
        },
      });

      if (error) throw error;

      toast.success("File synced to assistant successfully");
      await fetchData();
      setPerFileAssistant(prev => ({ ...prev, [fileId]: "" }));
    } catch (error: any) {
      console.error("Error syncing file:", error);
      toast.error(error.message || "Failed to sync file to assistant");
    } finally {
      setSyncing(false);
    }
  };

  const getFileAssignment = (vapiFileId: string | null) => {
    if (!vapiFileId) return null;
    const kb = knowledgeBases.find(k => k.file_ids?.includes(vapiFileId));
    if (!kb) return null;
    const assistant = assistants.find(a => a.id === kb.assistant_id);
    return { kb, assistant };
  };

  const isFileAssigned = (vapiFileId: string | null) => {
    if (!vapiFileId) return false;
    return knowledgeBases.some(k => k.file_ids?.includes(vapiFileId));
  };

  const syncedFiles = files.filter(f => f.status === "done" && f.vapi_file_id);
  const unassignedFiles = syncedFiles.filter(f => f.vapi_file_id && !isFileAssigned(f.vapi_file_id));
  const assignedFiles = syncedFiles.filter(f => f.vapi_file_id && isFileAssigned(f.vapi_file_id));
  
  const allUnassignedSelected = unassignedFiles.length > 0 && 
    unassignedFiles.every(f => selectedFiles.includes(f.local_file_id || ""));

  const toggleSelectAll = () => {
    if (allUnassignedSelected) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(unassignedFiles.map(f => f.local_file_id || "").filter(Boolean));
    }
  };

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
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{syncedFiles.length}</p>
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
                  <p className="text-3xl font-bold text-primary">{assignedFiles.length}</p>
                  <p className="text-sm text-muted-foreground mt-1">Assigned</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{unassignedFiles.length}</p>
                  <p className="text-sm text-muted-foreground mt-1">Available</p>
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
              {/* Assigned Files Section */}
              {assignedFiles.length > 0 && (
                <Card className="border-border/50 bg-muted/30">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Link2 className="w-5 h-5 text-primary" />
                      📎 Assigned Files ({assignedFiles.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {assignedFiles.map((file) => {
                      const assignment = getFileAssignment(file.vapi_file_id);
                      
                      return (
                        <Card key={file.id} className="border-border/50">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0 space-y-2">
                                <div>
                                  <p className="font-medium truncate">{file.file_name}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    Vapi ID: {file.vapi_file_id?.substring(0, 24)}...
                                  </p>
                                </div>
                                <Badge variant="default" className="text-xs gap-1">
                                  📎 Assigned to: {assignment?.assistant?.name || "Unknown Assistant"}
                                </Badge>
                              </div>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => 
                                  assignment && openUnsyncDialog(
                                    assignment.kb.id, 
                                    file.vapi_file_id!, 
                                    file.file_name,
                                    assignment.assistant?.name || "Unknown Assistant"
                                  )
                                }
                                className="shrink-0 gap-2"
                              >
                                <Unlink className="w-4 h-4" />
                                Unsync
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Available Files Section */}
              <Card className="border-border/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      📄 Available Files ({unassignedFiles.length})
                    </CardTitle>
                    {unassignedFiles.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={allUnassignedSelected}
                          onCheckedChange={toggleSelectAll}
                          id="select-all"
                        />
                        <label 
                          htmlFor="select-all" 
                          className="text-sm font-medium cursor-pointer"
                        >
                          Select All
                        </label>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {unassignedFiles.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>All synced files are assigned to assistants</p>
                    </div>
                  ) : (
                    <>
                      {/* Bulk Assignment Controls */}
                      <Card className="border-border/50 bg-muted/30">
                        <CardContent className="pt-6 space-y-4">
                          <div className="flex flex-col sm:flex-row gap-4 items-end">
                            <div className="flex-1 space-y-2 w-full">
                              <Label>Select Assistant for Bulk Assignment</Label>
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
                              className="gap-2 whitespace-nowrap"
                            >
                              {syncing ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Syncing...
                                </>
                              ) : (
                                `Assign Selected Files (${selectedFiles.length})`
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Files List */}
                      <div className="space-y-3">
                        {unassignedFiles.map((file) => (
                          <Card key={file.id} className="border-border/50">
                            <CardContent className="pt-4">
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  checked={selectedFiles.includes(file.local_file_id || "")}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedFiles([...selectedFiles, file.local_file_id || ""]);
                                    } else {
                                      setSelectedFiles(selectedFiles.filter(id => id !== file.local_file_id));
                                    }
                                  }}
                                  className="mt-1"
                                />

                                <div className="flex-1 min-w-0 space-y-3">
                                  <div>
                                    <p className="font-medium truncate">{file.file_name}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      Vapi ID: {file.vapi_file_id?.substring(0, 24)}...
                                    </p>
                                    <Badge variant="secondary" className="text-xs gap-1 mt-2">
                                      <CheckCircle2 className="w-3 h-3" />
                                      🟢 Synced to Vapi
                                    </Badge>
                                  </div>

                                  {/* Individual Sync Controls */}
                                  <div className="flex flex-col sm:flex-row gap-2">
                                    <Select 
                                      value={perFileAssistant[file.local_file_id || ""] || ""} 
                                      onValueChange={(value) => 
                                        setPerFileAssistant(prev => ({ ...prev, [file.local_file_id || ""]: value }))
                                      }
                                    >
                                      <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="Select Assistant" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {assistants.map((assistant) => (
                                          <SelectItem key={assistant.id} value={assistant.id}>
                                            {assistant.name || "Unnamed Assistant"}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Button
                                      size="sm"
                                      onClick={() => syncSingleFile(file.local_file_id || "", perFileAssistant[file.local_file_id || ""] || "")}
                                      disabled={!perFileAssistant[file.local_file_id || ""] || syncing}
                                      className="whitespace-nowrap gap-2"
                                    >
                                      <CheckCircle2 className="w-4 h-4" />
                                      Sync to Assistant
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>How it works:</strong> Select files using checkboxes for bulk assignment, or use the individual "Sync to Assistant" button on each file. 
              Knowledge bases are created automatically. Use "Unsync" to remove files without deleting them from Vapi.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Unsync Confirmation Dialog */}
      <AlertDialog open={unsyncDialogOpen} onOpenChange={setUnsyncDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Unsync File from Assistant
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              <p>
                Are you sure you want to remove this file from the assistant's knowledge base?
              </p>
              {fileToUnsync && (
                <div className="bg-muted/50 p-3 rounded-md space-y-2 text-foreground">
                  <p><strong>File:</strong> {fileToUnsync.fileName}</p>
                  <p><strong>Assistant:</strong> {fileToUnsync.assistantName}</p>
                </div>
              )}
              <p className="text-sm">
                The assistant will no longer have access to this file. The file will remain in Vapi and can be re-assigned later.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmUnsyncFile} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Unsync File
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default KnowledgeBaseManager;