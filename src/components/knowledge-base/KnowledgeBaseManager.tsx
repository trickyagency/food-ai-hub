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
  const [selectedKb, setSelectedKb] = useState<string>("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [addFilesDialogOpen, setAddFilesDialogOpen] = useState(false);
  const [newKbName, setNewKbName] = useState("Database Files Knowledge Base");
  const [newKbAssistant, setNewKbAssistant] = useState("");
  const [selectedFilesForKb, setSelectedFilesForKb] = useState<string[]>([]);
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
      
      if (kbData && kbData.length > 0 && !selectedKb) {
        setSelectedKb(kbData[0].id);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const createKnowledgeBase = async () => {
    if (!newKbAssistant) {
      toast.error("Please select an assistant");
      return;
    }

    const uploadedFiles = files.filter(f => f.status === "done" && f.vapi_file_id);
    const selectedFiles = uploadedFiles.filter(f => selectedFilesForKb.includes(f.local_file_id));
    
    if (selectedFiles.length === 0) {
      toast.error("Please select at least one file");
      return;
    }

    try {
      setSyncing(true);
      const fileIds = selectedFiles.map(f => f.local_file_id);

      const { data, error } = await supabase.functions.invoke("vapi-kb-sync", {
        body: {
          knowledgeBaseName: newKbName,
          assistantId: newKbAssistant,
          fileIds: fileIds,
        },
      });

      if (error) throw error;

      toast.success("Knowledge base created successfully!");
      setCreateDialogOpen(false);
      setNewKbName("Database Files Knowledge Base");
      setNewKbAssistant("");
      setSelectedFilesForKb([]);
      fetchData();
    } catch (error: any) {
      console.error("Knowledge base creation error:", error);
      toast.error(error.message || "Failed to create knowledge base");
    } finally {
      setSyncing(false);
    }
  };

  const addFilesToKnowledgeBase = async () => {
    if (!selectedKb) {
      toast.error("Please select a knowledge base");
      return;
    }

    const kb = knowledgeBases.find(k => k.id === selectedKb);
    if (!kb) return;

    const uploadedFiles = files.filter(f => f.status === "done" && f.vapi_file_id);
    const selectedFiles = uploadedFiles.filter(f => selectedFilesForKb.includes(f.local_file_id));
    
    if (selectedFiles.length === 0) {
      toast.error("Please select at least one file");
      return;
    }

    try {
      setSyncing(true);
      const newFileIds = selectedFiles.map(f => f.local_file_id);
      const allFileIds = [...new Set([...(kb.file_ids || []), ...newFileIds])];

      const { data, error } = await supabase.functions.invoke("vapi-kb-sync", {
        body: {
          knowledgeBaseName: kb.name,
          assistantId: kb.assistant_id,
          fileIds: allFileIds,
        },
      });

      if (error) throw error;

      toast.success("Files added to knowledge base!");
      setAddFilesDialogOpen(false);
      setSelectedFilesForKb([]);
      fetchData();
    } catch (error: any) {
      console.error("Add files error:", error);
      toast.error(error.message || "Failed to add files");
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

  const deleteKnowledgeBase = async (kbId: string) => {
    if (!confirm("Are you sure you want to delete this knowledge base? Files will remain in Vapi.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("vapi_knowledge_bases")
        .delete()
        .eq("id", kbId);

      if (error) throw error;

      toast.success("Knowledge base deleted");
      fetchData();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error("Failed to delete knowledge base");
    }
  };

  const getFilesInKb = (kbId: string) => {
    const kb = knowledgeBases.find(k => k.id === kbId);
    if (!kb) return [];
    
    return files.filter(f => kb.file_ids?.includes(f.vapi_file_id || ""));
  };

  const getAvailableFiles = () => {
    const kb = knowledgeBases.find(k => k.id === selectedKb);
    const kbFileIds = kb?.file_ids || [];
    
    return files.filter(f => 
      f.status === "done" && 
      f.vapi_file_id && 
      !kbFileIds.includes(f.vapi_file_id)
    );
  };

  const currentKb = knowledgeBases.find(k => k.id === selectedKb);
  const filesInKb = getFilesInKb(selectedKb);
  const availableFiles = getAvailableFiles();
  const uploadedCount = files.filter(f => f.status === "done").length;

  return (
    <div className="space-y-6">
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Database className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Knowledge Base Manager</CardTitle>
                <CardDescription>
                  Manage Vapi assistant knowledge bases and their files
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Knowledge Base
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{knowledgeBases.length}</p>
                  <p className="text-sm text-muted-foreground mt-1">Knowledge Bases</p>
                </div>
              </CardContent>
            </Card>
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
                  <p className="text-3xl font-bold text-primary">
                    {knowledgeBases.reduce((acc, kb) => acc + (kb.file_ids?.length || 0), 0)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Synced Files</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : knowledgeBases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No knowledge bases created yet</p>
              <p className="text-sm mt-1">Create your first knowledge base to get started</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Select Knowledge Base</Label>
                <Select value={selectedKb} onValueChange={setSelectedKb}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a knowledge base" />
                  </SelectTrigger>
                  <SelectContent>
                    {knowledgeBases.map((kb) => (
                      <SelectItem key={kb.id} value={kb.id}>
                        {kb.name} ({kb.file_ids?.length || 0} files)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {currentKb && (
                <Card className="border-border/50 bg-muted/30">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{currentKb.name}</CardTitle>
                        <CardDescription>
                          Assistant: {assistants.find(a => a.id === currentKb.assistant_id)?.name || "Unknown"}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAddFilesDialogOpen(true)}
                          disabled={availableFiles.length === 0}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Files
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteKnowledgeBase(currentKb.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Files in Knowledge Base ({filesInKb.length})
                      </h4>
                      {filesInKb.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No files in this knowledge base</p>
                      ) : (
                        <div className="space-y-2">
                          {filesInKb.map((file) => (
                            <div
                              key={file.id}
                              className="flex items-center justify-between p-3 bg-background rounded-lg border border-border/50"
                            >
                              <div className="flex items-center gap-3">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium text-sm">{file.file_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {file.vapi_file_id?.substring(0, 16)}...
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => unsyncFile(currentKb.id, file.vapi_file_id!, file.file_name)}
                                className="gap-2"
                              >
                                <Unlink className="w-4 h-4" />
                                Unsync
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>How it works:</strong> Create knowledge bases, add files from Vapi, and associate them with assistants. 
              Use "Unsync" to remove files from a knowledge base without deleting them from Vapi.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Create Knowledge Base Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Knowledge Base</DialogTitle>
            <DialogDescription>
              Select an assistant and files to create a new knowledge base
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Knowledge Base Name</Label>
              <Input
                value={newKbName}
                onChange={(e) => setNewKbName(e.target.value)}
                placeholder="Enter knowledge base name"
              />
            </div>
            <div className="space-y-2">
              <Label>Assistant</Label>
              <Select value={newKbAssistant} onValueChange={setNewKbAssistant}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose assistant" />
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
            <div className="space-y-2">
              <Label>Select Files ({selectedFilesForKb.length} selected)</Label>
              <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                {files.filter(f => f.status === "done" && f.vapi_file_id).map((file) => (
                  <div key={file.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedFilesForKb.includes(file.local_file_id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedFilesForKb([...selectedFilesForKb, file.local_file_id]);
                        } else {
                          setSelectedFilesForKb(selectedFilesForKb.filter(id => id !== file.local_file_id));
                        }
                      }}
                    />
                    <span className="text-sm">{file.file_name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createKnowledgeBase} disabled={syncing}>
              {syncing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Files Dialog */}
      <Dialog open={addFilesDialogOpen} onOpenChange={setAddFilesDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Files to Knowledge Base</DialogTitle>
            <DialogDescription>
              Select files to add to "{currentKb?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Available Files ({selectedFilesForKb.length} selected)</Label>
              {availableFiles.length === 0 ? (
                <p className="text-sm text-muted-foreground">All files are already in this knowledge base</p>
              ) : (
                <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                  {availableFiles.map((file) => (
                    <div key={file.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedFilesForKb.includes(file.local_file_id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedFilesForKb([...selectedFilesForKb, file.local_file_id]);
                          } else {
                            setSelectedFilesForKb(selectedFilesForKb.filter(id => id !== file.local_file_id));
                          }
                        }}
                      />
                      <span className="text-sm">{file.file_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddFilesDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addFilesToKnowledgeBase} disabled={syncing || selectedFilesForKb.length === 0}>
              {syncing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Files"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KnowledgeBaseManager;
