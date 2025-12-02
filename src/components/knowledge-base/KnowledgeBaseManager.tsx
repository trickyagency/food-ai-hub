import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Database, FileText, Plus, Trash2, Loader2, CheckCircle2, BrainCircuit } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface VapiFile {
  id: string;
  file_name: string;
  vapi_file_id: string | null;
  vapi_url: string | null;
  status: string;
  created_at: string;
  user_id: string;
}

interface KnowledgeBase {
  id: string;
  name: string;
  vapi_kb_id: string | null;
  file_ids: string[];
  assistant_id: string | null;
  status: string;
  user_id: string;
}

// Hardcoded Riley assistant
const RILEY_ASSISTANT_ID = "d9f41449-6376-40fe-b7e7-9d51f87be464";
const RILEY_ASSISTANT_NAME = "Riley";

const KnowledgeBaseManager = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [files, setFiles] = useState<VapiFile[]>([]);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [fileToRemove, setFileToRemove] = useState<VapiFile | null>(null);

  const fetchData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);

      // Fetch all vapi files that are synced
      const { data: vapiFiles, error: filesError } = await supabase
        .from("vapi_files")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "done")
        .order("created_at", { ascending: false });
      
      if (filesError) throw filesError;
      setFiles(vapiFiles || []);

      // Fetch the single global knowledge base
      const { data: kbData, error: kbError } = await supabase
        .from("vapi_knowledge_bases")
        .select("*")
        .eq("user_id", user.id)
        .eq("name", "Global Knowledge Base")
        .maybeSingle();
      
      if (kbError) throw kbError;
      setKnowledgeBase(kbData);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load knowledge base data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const addFileToKB = async (fileId: string) => {
    if (!user) return;
    
    try {
      setSyncing(true);
      const currentFileIds = knowledgeBase?.file_ids || [];
      const updatedFileIds = [...currentFileIds, fileId];

      console.log("Adding file to KB for Riley assistant:", { fileId, updatedFileIds, assistantId: RILEY_ASSISTANT_ID });

      const { data, error } = await supabase.functions.invoke("vapi-kb-sync", {
        body: {
          knowledgeBaseName: "Global Knowledge Base",
          fileIds: updatedFileIds,
          assistantId: RILEY_ASSISTANT_ID,
        },
      });

      if (error) throw error;

      console.log("KB sync response:", data);

      toast({
        title: "Success",
        description: `File added to ${RILEY_ASSISTANT_NAME}'s knowledge base successfully`,
      });

      await fetchData();
    } catch (error: any) {
      console.error("Error adding file to KB:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add file to knowledge base",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const openRemoveDialog = (file: VapiFile) => {
    setFileToRemove(file);
    setRemoveDialogOpen(true);
  };

  const confirmRemoveFile = async () => {
    if (!fileToRemove || !user) return;
    
    try {
      setSyncing(true);
      
      const { error } = await supabase.functions.invoke("vapi-kb-unsync", {
        body: {
          knowledgeBaseId: knowledgeBase?.id,
          fileId: fileToRemove.id,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "File removed from knowledge base",
      });

      await fetchData();
    } catch (error: any) {
      console.error("Error removing file from KB:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove file from knowledge base",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
      setRemoveDialogOpen(false);
      setFileToRemove(null);
    }
  };

  const filesInKB = files.filter((file) => knowledgeBase?.file_ids?.includes(file.id));
  const availableFiles = files.filter((file) => !knowledgeBase?.file_ids?.includes(file.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Files in Vapi</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{files.length}</div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Knowledge Base</CardTitle>
              <BrainCircuit className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filesInKB.length}</div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Files</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{availableFiles.length}</div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assistant</CardTitle>
              <BrainCircuit className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{RILEY_ASSISTANT_NAME}</div>
            </CardContent>
          </Card>
        </div>

        {/* Files in Knowledge Base */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-primary" />
              Files in Knowledge Base
            </CardTitle>
            <CardDescription>
              Files currently in the global knowledge base that your assistant can access
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filesInKB.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No files in knowledge base yet</p>
                <p className="text-xs mt-1">Add files from the available files section below</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filesInKB.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Added {new Date(file.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        In KB
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openRemoveDialog(file)}
                      disabled={syncing}
                      className="ml-3"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove from Knowledge Base
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Files */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Available Files
            </CardTitle>
            <CardDescription>
              Files synced to Vapi but not yet added to the knowledge base
            </CardDescription>
          </CardHeader>
          <CardContent>
            {availableFiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">All synced files are in the knowledge base</p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded {new Date(file.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-green-500 text-green-500">
                        🟢 Synced to Vapi
                      </Badge>
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => addFileToKB(file.id)}
                      disabled={syncing}
                      className="ml-3"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add to KB
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Knowledge Base Assistant */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BrainCircuit className="w-5 h-5" />
              Knowledge Base Assistant
            </CardTitle>
            <CardDescription>
              This knowledge base is used by the Riley assistant
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-border/50 rounded-lg bg-muted/30">
              <div className="space-y-1">
                <p className="font-medium">{RILEY_ASSISTANT_NAME}</p>
                <p className="text-sm text-muted-foreground font-mono">{RILEY_ASSISTANT_ID}</p>
              </div>
              <Badge variant="default" className="bg-primary">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Active
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="border-border/50 shadow-sm bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <CardHeader>
            <CardTitle className="text-base text-blue-900 dark:text-blue-100">
              How to use the Knowledge Base Manager
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <p>1. Upload files in the <strong>Database Files</strong> section</p>
            <p>2. Files are automatically synced to Vapi</p>
            <p>3. Add files to the knowledge base using the <strong>Add to KB</strong> button</p>
            <p>4. All files in the knowledge base are used by the Riley assistant</p>
            <p>5. The assistant will use these files for answering questions</p>
          </CardContent>
        </Card>
      </div>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove file from Knowledge Base?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{fileToRemove?.file_name}</strong> from the
              knowledge base? The file will remain in Vapi storage and can be re-added later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveFile}>
              Remove from KB
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default KnowledgeBaseManager;
