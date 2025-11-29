import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { Upload, File, X, CheckCircle2, AlertCircle, FileText, Trash2, Download, Edit2, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { z } from "zod";
import { auditLog } from "@/lib/auditLog";

const WEBHOOK_URL = "https://n8n.quadrilabs.com/webhook-test/databaseupload";
const DELETE_WEBHOOK_URL = "https://n8n.quadrilabs.com/webhook-test/delete_file";
const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

const fileSchema = z.object({
  name: z.string().max(255, "File name must be less than 255 characters"),
  size: z.number().max(MAX_FILE_SIZE, "File size must be less than 200MB"),
  type: z.string().refine(
    (type) => type === 'application/pdf' || 
              type === 'application/json' || 
              type === 'text/csv' ||
              type === 'application/vnd.ms-excel' ||
              type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
              type === 'text/plain',
    "Invalid file type. Only PDF, JSON, CSV, Excel, and TXT files are allowed"
  ),
});

interface UploadedFile {
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  fileId?: string;
}

interface FileRecord {
  id: string;
  file_name: string | null;
  size: number | null;
  mime_type: string | null;
  storage_path: string;
  created_at: string | null;
  updated_at: string | null;
  user_id: string;
}

const DatabaseFileManager = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [storedFiles, setStoredFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [renameDialog, setRenameDialog] = useState<{ open: boolean; file: FileRecord | null }>({ open: false, file: null });
  const [newFileName, setNewFileName] = useState("");
  const [previewDialog, setPreviewDialog] = useState<{ open: boolean; file: FileRecord | null; content: string }>({ 
    open: false, 
    file: null, 
    content: "" 
  });

  useEffect(() => {
    fetchStoredFiles();
  }, []);

  const fetchStoredFiles = async () => {
    try {
      const { data, error } = await supabase
        .from("files")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setStoredFiles(data || []);
    } catch (error) {
      console.error("Error fetching files:", error);
      toast.error("Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach(({ file, errors }) => {
        errors.forEach((error: any) => {
          toast.error(`${file.name}: ${error.message}`);
        });
      });
    }

    const validFiles: File[] = [];
    acceptedFiles.forEach(file => {
      try {
        fileSchema.parse({
          name: file.name,
          size: file.size,
          type: file.type,
        });
        validFiles.push(file);
      } catch (error) {
        if (error instanceof z.ZodError) {
          toast.error(`${file.name}: ${error.errors[0].message}`);
        }
      }
    });

    const newFiles = validFiles.map(file => ({
      file,
      status: "pending" as const,
      progress: 0,
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/json': ['.json'],
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
    },
    maxSize: MAX_FILE_SIZE,
  });

  const uploadFileWithRetry = async (index: number, retryCount = 0): Promise<void> => {
    const MAX_RETRIES = 3;
    const fileData = files[index];
    
    // Generate unique file ID (reuse if retrying)
    const fileId = fileData.fileId || crypto.randomUUID();
    
    // Update files state with fileId
    if (!fileData.fileId) {
      setFiles(prev => prev.map((f, i) => i === index ? { ...f, fileId } : f));
    }
    
    // Get user data
    const { data: { user } } = await supabase.auth.getUser();
    let userRole = null;
    
    if (user) {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      userRole = roleData?.role;
    }
    
    // Create upload history record
    if (user && retryCount === 0) {
      await supabase.from('file_upload_history').insert({
        file_id: fileId,
        file_name: fileData.file.name,
        file_size: fileData.file.size,
        mime_type: fileData.file.type,
        user_id: user.id,
        upload_status: 'pending',
        webhook_url: WEBHOOK_URL,
        retry_count: 0
      });
    }
    
    // Upload to Supabase storage first to get storage path
    const storagePath = `${user?.id}/${fileId}-${fileData.file.name}`;
    let storageUploadSuccess = false;
    
    if (user) {
      const { error: storageError } = await supabase.storage
        .from('database-files')
        .upload(storagePath, fileData.file);
      
      if (storageError) {
        console.error('Storage upload error:', storageError);
        toast.error('Failed to upload file to storage');
        throw new Error(`Storage upload failed: ${storageError.message}`);
      }
      
      storageUploadSuccess = true;
      
      // Insert into files table
      const { error: dbError } = await supabase.from('files').insert({
        id: fileId,
        file_name: fileData.file.name,
        size: fileData.file.size,
        mime_type: fileData.file.type,
        storage_path: storagePath,
        user_id: user.id
      });
      
      if (dbError) {
        console.error('Database insert error:', dbError);
      }
    }
    
    const formData = new FormData();
    formData.append('file', fileData.file);
    formData.append('fileId', fileId);
    formData.append('fileName', fileData.file.name);
    formData.append('fileSize', fileData.file.size.toString());
    formData.append('mimeType', fileData.file.type);
    formData.append('uploadedAt', new Date().toISOString());
    formData.append('storagePath', storagePath);
    
    // Add user data
    if (user) {
      formData.append('userId', user.id);
      formData.append('userEmail', user.email || '');
      if (userRole) {
        formData.append('userRole', userRole);
      }
    }

    // Validate storage upload was successful before proceeding
    if (!storageUploadSuccess) {
      const errorMessage = 'File validation failed: Storage upload unsuccessful';
      console.error(errorMessage);
      
      setFiles(prev => prev.map((f, i) => i === index ? { ...f, status: "error" as const } : f));
      toast.error(`Failed to validate ${fileData.file.name}: Storage upload unsuccessful`);
      
      if (user) {
        await supabase.from('file_upload_history').update({
          upload_status: 'failed',
          error_message: errorMessage,
          completed_at: new Date().toISOString()
        }).eq('file_id', fileId).eq('user_id', user.id);
      }
      return;
    }
    
    // Verify file exists in storage before sending webhook
    if (user) {
      const { data: verifyData, error: verifyError } = await supabase.storage
        .from('database-files')
        .list(user.id, {
          search: `${fileId}-${fileData.file.name}`
        });
      
      if (verifyError || !verifyData || verifyData.length === 0) {
        const errorMessage = 'File validation failed: File not found in storage after upload';
        console.error(errorMessage, verifyError);
        
        setFiles(prev => prev.map((f, i) => i === index ? { ...f, status: "error" as const } : f));
        toast.error(`Failed to validate ${fileData.file.name}: File not confirmed in storage`);
        
        // Rollback: Clean up database entry
        await supabase.from('files').delete().eq('id', fileId);
        await supabase.from('file_upload_history').update({
          upload_status: 'failed',
          error_message: errorMessage,
          completed_at: new Date().toISOString()
        }).eq('file_id', fileId).eq('user_id', user.id);
        
        return;
      }
    }
    
    toast.info(`${fileData.file.name} stored successfully, sending webhook notification...`);

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        body: formData,
      });

      let responseData = null;
      let responseText = '';
      
      try {
        responseText = await response.text();
        if (responseText) {
          responseData = JSON.parse(responseText);
        }
      } catch (e) {
        // Response wasn't JSON, use text
      }

      // Store webhook response in database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('webhook_responses').insert({
          user_id: user.id,
          file_id: fileId,
          file_name: fileData.file.name,
          file_size: fileData.file.size,
          mime_type: fileData.file.type,
          webhook_url: WEBHOOK_URL,
          status_code: response.status,
          response_body: responseData,
          error_message: response.ok ? null : responseText,
          retry_count: retryCount,
          success: response.ok
        });
      }

      if (response.ok) {
        console.log('n8n webhook response:', responseData || responseText);
        
        // Update upload history to success
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('file_upload_history').update({
            upload_status: 'success',
            completed_at: new Date().toISOString()
          }).eq('file_id', fileId).eq('user_id', user.id);
        }
        
        toast.success(`${fileData.file.name} uploaded successfully with ID: ${fileId}`);
        
        setFiles(prev => prev.map((f, i) => i === index ? { ...f, status: "success" as const, progress: 100 } : f));
        
        // Refresh the file list
        setTimeout(() => {
          fetchStoredFiles();
          setFiles(prev => prev.filter((_, i) => i !== index));
        }, 1000);
      } else {
        throw new Error(`Upload failed: ${response.status} - ${responseText || 'Unknown error'}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      console.error(`Upload error (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, error);

      if (retryCount < MAX_RETRIES) {
        // Exponential backoff: 2^retry * 1000ms (1s, 2s, 4s)
        const backoffDelay = Math.pow(2, retryCount) * 1000;
        toast.info(`Retrying upload for ${fileData.file.name} in ${backoffDelay / 1000}s... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
        
        // Update upload history with retry attempt
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('file_upload_history').update({
            upload_status: 'uploading',
            retry_count: retryCount + 1
          }).eq('file_id', fileId).eq('user_id', user.id);
        }
        
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        return uploadFileWithRetry(index, retryCount + 1);
      } else {
        // All retries exhausted - ROLLBACK: Delete file from storage and database
        setFiles(prev => prev.map((f, i) => i === index ? { ...f, status: "error" as const } : f));
        toast.error(`Failed to upload ${fileData.file.name} after ${MAX_RETRIES + 1} attempts. Rolling back...`);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Delete file from storage
          const { error: deleteStorageError } = await supabase.storage
            .from('database-files')
            .remove([storagePath]);
          
          if (deleteStorageError) {
            console.error('Rollback: Failed to delete file from storage:', deleteStorageError);
            toast.warning('Failed to clean up storage, manual cleanup may be required');
          } else {
            console.log('Rollback: Successfully deleted file from storage:', storagePath);
          }
          
          // Delete database record
          const { error: deleteDbError } = await supabase
            .from('files')
            .delete()
            .eq('id', fileId);
          
          if (deleteDbError) {
            console.error('Rollback: Failed to delete database record:', deleteDbError);
          } else {
            console.log('Rollback: Successfully deleted database record:', fileId);
          }
          
          // Update upload history to failed
          await supabase.from('file_upload_history').update({
            upload_status: 'failed',
            error_message: `${errorMessage} (Rolled back: file deleted from storage and database)`,
            retry_count: retryCount,
            completed_at: new Date().toISOString()
          }).eq('file_id', fileId).eq('user_id', user.id);
          
          // Log final failure
          await supabase.from('webhook_responses').insert({
            user_id: user.id,
            file_id: fileId,
            file_name: fileData.file.name,
            file_size: fileData.file.size,
            mime_type: fileData.file.type,
            webhook_url: WEBHOOK_URL,
            status_code: null,
            response_body: null,
            error_message: `${errorMessage} (Rolled back)`,
            retry_count: retryCount,
            success: false
          });
          
          toast.success('Rollback completed: File removed from storage and database');
        }
      }
    }
  };

  const uploadFile = async (index: number) => {
    setFiles(prev => prev.map((f, i) => i === index ? { ...f, status: "uploading" as const } : f));
    await uploadFileWithRetry(index, 0);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadAll = () => {
    files.forEach((file, index) => {
      if (file.status === "pending") {
        uploadFile(index);
      }
    });
  };

  const handleDownload = async (file: FileRecord) => {
    try {
      const { data, error } = await supabase.storage
        .from("database-files")
        .download(file.storage_path);

      if (error) throw error;

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
      // Get user data
      const { data: { user } } = await supabase.auth.getUser();
      let userRole = null;
      
      if (user) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        userRole = roleData?.role;
      }

      // Send delete request to n8n webhook with complete file metadata
      const response = await fetch(DELETE_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: file.id,
          fileName: file.file_name,
          storagePath: file.storage_path,
          fileSize: file.size,
          mimeType: file.mime_type,
          createdAt: file.created_at,
          updatedAt: file.updated_at,
          userId: user?.id,
          userEmail: user?.email || '',
          userRole: userRole,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Delete failed: ${response.status} - ${errorText || 'Unknown error'}`);
      }

      await auditLog.fileDeleted(file.file_name || "Unnamed file", file.id);

      setStoredFiles(storedFiles.filter((f) => f.id !== file.id));
      toast.success(`Deleted ${file.file_name}`);
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Failed to delete file");
    }
  };

  const openRenameDialog = (file: FileRecord) => {
    setRenameDialog({ open: true, file });
    setNewFileName(file.file_name || "");
  };

  const handleRename = async () => {
    if (!renameDialog.file || !newFileName.trim()) return;

    try {
      const { error } = await supabase
        .from("files")
        .update({ file_name: newFileName.trim() })
        .eq("id", renameDialog.file.id);

      if (error) throw error;

      setStoredFiles(storedFiles.map(f => 
        f.id === renameDialog.file?.id ? { ...f, file_name: newFileName.trim() } : f
      ));
      
      toast.success("File renamed successfully");
      setRenameDialog({ open: false, file: null });
      setNewFileName("");
    } catch (error) {
      console.error("Error renaming file:", error);
      toast.error("Failed to rename file");
    }
  };

  const handlePreview = async (file: FileRecord) => {
    // Only preview text-based files
    const textTypes = ['text/plain', 'application/json', 'text/csv'];
    if (!textTypes.includes(file.mime_type || "")) {
      toast.error("Preview is only available for text, JSON, and CSV files");
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from("database-files")
        .download(file.storage_path);

      if (error) throw error;

      const text = await data.text();
      setPreviewDialog({ open: true, file, content: text });
    } catch (error) {
      console.error("Error previewing file:", error);
      toast.error("Failed to preview file");
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

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="bg-gradient-card border-border/50 shadow-elegant">
        <CardHeader>
          <CardTitle className="text-foreground">Upload Database Files</CardTitle>
          <CardDescription>Upload your food business data files to sync with the AI agent (Max 200MB)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300 ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-primary/5"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-foreground font-medium">Drop the files here...</p>
            ) : (
              <>
                <p className="text-foreground font-medium mb-2">Drag & drop files here, or click to select</p>
                <p className="text-sm text-muted-foreground">Supports: PDF, JSON, CSV, Excel, TXT (Max 200MB)</p>
              </>
            )}
          </div>

          {files.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{files.length} file(s) selected</p>
                <Button onClick={uploadAll} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Upload All
                </Button>
              </div>

              <div className="space-y-2">
                {files.map((fileData, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border"
                  >
                    <File className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{fileData.file.name}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">{formatFileSize(fileData.file.size)}</p>
                        {fileData.fileId && (
                          <p className="text-xs text-primary font-mono">ID: {fileData.fileId.slice(0, 8)}...</p>
                        )}
                      </div>
                    </div>
                    {fileData.status === "success" && (
                      <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                    )}
                    {fileData.status === "error" && (
                      <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                    )}
                    {fileData.status === "uploading" && (
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    )}
                    {fileData.status === "pending" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFile(index)}
                        className="flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Management Section */}
      <Card className="bg-gradient-card border-border/50 shadow-elegant">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Manage Database Files
          </CardTitle>
          <CardDescription>
            View, download, rename, preview, and delete uploaded database files
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading files...</p>
          ) : storedFiles.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-8 text-muted-foreground">
              <FileText className="h-12 w-12" />
              <div className="text-center space-y-2">
                <p className="text-lg font-medium">No files uploaded yet</p>
                <p className="text-sm">Upload your first database file to get started</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {storedFiles.map((file) => (
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
                      onClick={() => handlePreview(file)}
                      className="hover:bg-primary/10 hover:text-primary"
                      title="Preview file"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openRenameDialog(file)}
                      className="hover:bg-primary/10 hover:text-primary"
                      title="Rename file"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
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

      {/* Rename Dialog */}
      <Dialog open={renameDialog.open} onOpenChange={(open) => setRenameDialog({ open, file: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
            <DialogDescription>
              Enter a new name for the file
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="Enter new file name"
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleRename();
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setRenameDialog({ open: false, file: null })}
              >
                Cancel
              </Button>
              <Button onClick={handleRename}>
                Rename
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialog.open} onOpenChange={(open) => setPreviewDialog({ open, file: null, content: "" })}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>File Preview: {previewDialog.file?.file_name}</DialogTitle>
            <DialogDescription>
              {previewDialog.file?.mime_type} • {formatFileSize(previewDialog.file?.size || 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 overflow-auto max-h-[60vh]">
            <pre className="text-sm text-foreground whitespace-pre-wrap bg-muted p-4 rounded-lg">
              {previewDialog.content}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DatabaseFileManager;
