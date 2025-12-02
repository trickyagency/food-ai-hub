import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { Upload, File, X, CheckCircle2, AlertCircle, FileText, Trash2, Download, Edit2, Eye, Wifi, WifiOff, Cloud, CloudOff, History, CheckSquare, Square } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { z } from "zod";
import { auditLog } from "@/lib/auditLog";
import FileSyncButton from "@/components/knowledge-base/FileSyncButton";

const WEBHOOK_URL = "https://n8n.quadrilabs.com/webhook/2e1e8c7c-8d78-4203-bafd-4a1482234078";
const DELETE_WEBHOOK_URL = "https://n8n.quadrilabs.com/webhook/faf85808-43a9-4b09-86f2-b316b09a473c";
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
  errorDetails?: {
    message: string;
    timestamp: string;
    statusCode?: number;
    responseBody?: any;
  };
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

interface VapiFileSync {
  id: string;
  local_file_id: string;
  file_name: string;
  vapi_file_id: string | null;
  status: string;
  error_message: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const DatabaseFileManager = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [storedFiles, setStoredFiles] = useState<FileRecord[]>([]);
  const [vapiSyncData, setVapiSyncData] = useState<Record<string, VapiFileSync>>({});
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [webhookStatus, setWebhookStatus] = useState<"unknown" | "testing" | "connected" | "failed">("unknown");
  const [renameDialog, setRenameDialog] = useState<{ open: boolean; file: FileRecord | null }>({ open: false, file: null });
  const [newFileName, setNewFileName] = useState("");
  const [previewDialog, setPreviewDialog] = useState<{ open: boolean; file: FileRecord | null; content: string }>({ 
    open: false, 
    file: null, 
    content: "" 
  });
  const [syncHistoryDialog, setSyncHistoryDialog] = useState<{ open: boolean; file: FileRecord | null; history: VapiFileSync | null }>({
    open: false,
    file: null,
    history: null
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
      
      // Fetch Vapi sync status for all files
      await fetchVapiSyncStatus();
    } catch (error) {
      console.error("Error fetching files:", error);
      toast.error("Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  const fetchVapiSyncStatus = async () => {
    try {
      const { data, error } = await supabase
        .from("vapi_files")
        .select("*");

      if (error) throw error;
      
      // Create a map of local_file_id to vapi_files data
      const syncMap: Record<string, VapiFileSync> = {};
      data?.forEach((item: any) => {
        if (item.local_file_id) {
          syncMap[item.local_file_id] = item;
        }
      });
      
      setVapiSyncData(syncMap);
    } catch (error) {
      console.error("Error fetching Vapi sync status:", error);
    }
  };

  const testWebhookConnection = async () => {
    setWebhookStatus("testing");
    toast.info("Testing webhook connection...");
    
    try {
      const testPayload = {
        test: true,
        timestamp: new Date().toISOString(),
        message: "Connection test from dashboard"
      };

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload),
      });

      if (response.ok) {
        setWebhookStatus("connected");
        toast.success("Webhook connection successful!");
        console.log("Webhook test response:", await response.text());
      } else {
        setWebhookStatus("failed");
        toast.error(`Webhook test failed: ${response.status} ${response.statusText}`);
        console.error("Webhook test failed:", response.status, await response.text());
      }
    } catch (error) {
      setWebhookStatus("failed");
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      toast.error(`Webhook connection failed: ${errorMessage}`);
      console.error("Webhook test error:", error);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach(({ file, errors }) => {
        errors.forEach((error: any) => {
          toast.error(`${file.name}: ${error.message}`);
        });
      });
    }

    const validFiles: File[] = [];
    
    // Check for duplicates in already stored files
    for (const file of acceptedFiles) {
      try {
        fileSchema.parse({
          name: file.name,
          size: file.size,
          type: file.type,
        });
        
        // Check if file already exists in database
        const { data: existingFile } = await supabase
          .from('files')
          .select('file_name')
          .eq('file_name', file.name)
          .maybeSingle();
        
        if (existingFile) {
          toast.error(`${file.name} already exists. Please rename or delete the existing file first.`);
          continue;
        }
        
        // Check if file is already in the pending upload queue
        const isDuplicateInQueue = files.some(f => f.file.name === file.name);
        if (isDuplicateInQueue) {
          toast.error(`${file.name} is already in the upload queue.`);
          continue;
        }
        
        validFiles.push(file);
      } catch (error) {
        if (error instanceof z.ZodError) {
          toast.error(`${file.name}: ${error.errors[0].message}`);
        }
      }
    }

    const newFiles = validFiles.map(file => ({
      file,
      status: "pending" as const,
      progress: 0,
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, [files, storedFiles]);

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

  const uploadFile = async (index: number): Promise<void> => {
    const fileData = files[index];
    const BUCKET_NAME = 'database-files';
    
    setFiles(prev => prev.map((f, i) => i === index ? { ...f, status: "uploading" as const } : f));
    
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
    if (user) {
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
    
    // Update progress: Starting upload
    setFiles(prev => prev.map((f, i) => i === index ? { ...f, progress: 10 } : f));
    
    if (user) {
      const { error: storageError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, fileData.file);
      
      if (storageError) {
        const errorDetails = {
          message: `Storage upload failed: ${storageError.message}`,
          timestamp: new Date().toISOString(),
          statusCode: 500,
          responseBody: storageError
        };
        console.error('Storage upload error:', storageError);
        setFiles(prev => prev.map((f, i) => i === index ? { 
          ...f, 
          status: "error" as const, 
          errorDetails 
        } : f));
        toast.error('Failed to upload file to storage');
        throw new Error(errorDetails.message);
      }
      
      storageUploadSuccess = true;
      
      // Update progress: Storage upload complete
      setFiles(prev => prev.map((f, i) => i === index ? { ...f, progress: 40 } : f));
      
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
      
      // Update progress: Database record created
      setFiles(prev => prev.map((f, i) => i === index ? { ...f, progress: 50 } : f));
    }
    
    const formData = new FormData();
    formData.append('file', fileData.file);
    formData.append('fileId', fileId);
    formData.append('fileName', fileData.file.name);
    formData.append('fileSize', fileData.file.size.toString());
    formData.append('mimeType', fileData.file.type);
    formData.append('uploadedAt', new Date().toISOString());
    formData.append('storagePath', storagePath);
    formData.append('bucketName', BUCKET_NAME); // Explicit bucket name for n8n
    
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
        .from(BUCKET_NAME)
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
    
    // Update progress: Sending webhook
    setFiles(prev => prev.map((f, i) => i === index ? { ...f, progress: 70 } : f));

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        body: formData,
      });
      
      // Update progress: Webhook sent
      setFiles(prev => prev.map((f, i) => i === index ? { ...f, progress: 85 } : f));

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
      
      // Detailed logging for webhook response
      console.log('=== Webhook Response Details ===');
      console.log('Status:', response.status, response.statusText);
      console.log('URL:', WEBHOOK_URL);
      console.log('File:', fileData.file.name);
      console.log('File ID:', fileId);
      console.log('Response Body:', responseData || responseText);
      console.log('===============================');

      // Store webhook response in database
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
          retry_count: 0,
          success: response.ok
        });
      }

      if (response.ok) {
        // Update upload history to success
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
        const errorDetails = {
          message: `Webhook failed: ${response.status} ${response.statusText}`,
          timestamp: new Date().toISOString(),
          statusCode: response.status,
          responseBody: responseData || responseText
        };
        
        console.error('=== Webhook Error Details ===');
        console.error('Status:', response.status, response.statusText);
        console.error('Response:', responseData || responseText);
        console.error('=============================');
        
        throw new Error(errorDetails.message);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      const errorDetails = {
        message: errorMessage,
        timestamp: new Date().toISOString(),
        statusCode: undefined,
        responseBody: undefined
      };
      
      console.error('=== Upload Error Details ===');
      console.error('Error:', error);
      console.error('File:', fileData.file.name);
      console.error('File ID:', fileId);
      console.error('============================');
      
      // ROLLBACK: Delete file from storage and database
      setFiles(prev => prev.map((f, i) => i === index ? { 
        ...f, 
        status: "error" as const, 
        errorDetails 
      } : f));
      toast.error(`Failed to upload ${fileData.file.name}. Rolling back...`);
      
      if (user) {
        // Delete file from storage
        const { error: deleteStorageError } = await supabase.storage
          .from(BUCKET_NAME)
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
          retry_count: 0,
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
          retry_count: 0,
          success: false
        });
        
        toast.success('Rollback completed: File removed from storage and database');
      }
    }
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
      // 0. Check if file is synced to Vapi and delete from Vapi first
      const { data: vapiFile } = await supabase
        .from('vapi_files')
        .select('*')
        .eq('local_file_id', file.id)
        .maybeSingle();

      if (vapiFile) {
        console.log('File is synced to Vapi, deleting from Vapi first...');
        toast.info('Removing file from Vapi...');

        try {
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session) {
            throw new Error('No active session');
          }

          const { data: vapiDeleteData, error: vapiDeleteError } = await supabase.functions.invoke(
            'vapi-file-delete',
            {
              body: { fileId: file.id },
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            }
          );

          if (vapiDeleteError) {
            console.error('Vapi deletion error:', vapiDeleteError);
            toast.warning('Failed to delete from Vapi, continuing with local deletion...');
          } else if (vapiDeleteData?.deletedFromVapi) {
            toast.success('File removed from Vapi');
          }
        } catch (vapiError) {
          console.error('Error deleting from Vapi:', vapiError);
          toast.warning('Failed to delete from Vapi, continuing with local deletion...');
        }
      }

      // 1. Delete from Supabase Storage
      const { error: storageError } = await supabase.storage
        .from("database-files")
        .remove([file.storage_path]);

      if (storageError) {
        console.error("Storage deletion error:", storageError);
        throw new Error(`Failed to delete file from storage: ${storageError.message}`);
      }

      // 2. Delete from Supabase database
      const { error: dbError } = await supabase
        .from("files")
        .delete()
        .eq("id", file.id);

      if (dbError) {
        console.error("Database deletion error:", dbError);
        throw new Error(`Failed to delete file from database: ${dbError.message}`);
      }

      // 3. Get user data for webhook notification
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

      // 4. Send delete notification to n8n webhook
      try {
        const response = await fetch(DELETE_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileId: file.id,
            fileName: file.file_name,
            storagePath: file.storage_path,
            bucketName: 'database-files',
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
          console.warn(`Webhook notification failed: ${response.status}`);
        }
      } catch (webhookError) {
        // Don't fail the entire deletion if webhook fails
        console.warn("Webhook notification failed:", webhookError);
      }

      // 5. Create audit log
      await auditLog.fileDeleted(file.file_name || "Unnamed file", file.id);

      // 6. Update local state
      setStoredFiles(storedFiles.filter((f) => f.id !== file.id));
      toast.success(`Deleted ${file.file_name}`);
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete file");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) {
      toast.error("No files selected. Please select files to delete");
      return;
    }

    const confirmMessage = `Are you sure you want to delete ${selectedFiles.size} file(s)? This will remove them from both Supabase and Vapi (if synced).`;
    if (!confirm(confirmMessage)) return;

    const filesToDelete = storedFiles.filter(f => selectedFiles.has(f.id));
    let successCount = 0;
    let failCount = 0;

    toast.info(`Deleting ${filesToDelete.length} file(s)...`);

    for (const file of filesToDelete) {
      try {
        // Check if file is synced to Vapi and delete from Vapi first
        const vapiFile = vapiSyncData[file.id];

        if (vapiFile) {
          console.log('File is synced to Vapi, deleting from Vapi first...');

          try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
              await supabase.functions.invoke(
                'vapi-file-delete',
                {
                  body: { fileId: file.id },
                  headers: {
                    Authorization: `Bearer ${session.access_token}`,
                  },
                }
              );
            }
          } catch (vapiError) {
            console.error('Error deleting from Vapi:', vapiError);
          }
        }

        // Delete from Supabase Storage
        const { error: storageError } = await supabase.storage
          .from("database-files")
          .remove([file.storage_path]);

        if (storageError) throw storageError;

        // Delete from Supabase database
        const { error: dbError } = await supabase
          .from("files")
          .delete()
          .eq("id", file.id);

        if (dbError) throw dbError;

        // Get user data for webhook notification
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

        // Send delete notification to n8n webhook
        try {
          await fetch(DELETE_WEBHOOK_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileId: file.id,
              fileName: file.file_name,
              storagePath: file.storage_path,
              bucketName: 'database-files',
              fileSize: file.size,
              mimeType: file.mime_type,
              createdAt: file.created_at,
              updatedAt: file.updated_at,
              userId: user?.id,
              userEmail: user?.email || '',
              userRole: userRole,
            }),
          });
        } catch (webhookError) {
          console.warn("Webhook notification failed:", webhookError);
        }

        // Create audit log
        await auditLog.fileDeleted(file.file_name || "Unnamed file", file.id);

        successCount++;
      } catch (error) {
        console.error(`Error deleting file ${file.file_name}:`, error);
        failCount++;
      }
    }

    // Update local state
    setStoredFiles(storedFiles.filter(f => !selectedFiles.has(f.id)));
    setSelectedFiles(new Set());

    if (failCount > 0) {
      toast.error(`Bulk deletion completed. Successfully deleted ${successCount} file(s). Failed: ${failCount}`);
    } else {
      toast.success(`Bulk deletion completed. Successfully deleted ${successCount} file(s).`);
    }

    // Refresh data
    await fetchStoredFiles();
  };

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedFiles.size === storedFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(storedFiles.map(f => f.id)));
    }
  };

  const openSyncHistory = (file: FileRecord) => {
    const syncHistory = vapiSyncData[file.id] || null;
    setSyncHistoryDialog({ open: true, file, history: syncHistory });
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground">Upload Database Files</CardTitle>
              <CardDescription>Upload your food business data files to sync with the AI agent (Max 200MB)</CardDescription>
            </div>
            <Button
              onClick={testWebhookConnection}
              disabled={webhookStatus === "testing"}
              variant={webhookStatus === "connected" ? "outline" : "default"}
              size="sm"
              className="gap-2"
            >
              {webhookStatus === "testing" ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Testing...
                </>
              ) : webhookStatus === "connected" ? (
                <>
                  <Wifi className="w-4 h-4" />
                  Connected
                </>
              ) : webhookStatus === "failed" ? (
                <>
                  <WifiOff className="w-4 h-4" />
                  Test Connection
                </>
              ) : (
                <>
                  <Wifi className="w-4 h-4" />
                  Test Connection
                </>
              )}
            </Button>
          </div>
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
                    className="p-3 rounded-lg bg-card border border-border space-y-2"
                  >
                    <div className="flex items-center gap-3">
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
                    
                    {/* Progress Bar */}
                    {(fileData.status === "uploading" || fileData.status === "success") && (
                      <div className="space-y-1">
                        <Progress value={fileData.progress} className="h-2" />
                        <p className="text-xs text-muted-foreground">{fileData.progress}% complete</p>
                      </div>
                    )}
                    
                    {/* Error Details */}
                    {fileData.status === "error" && fileData.errorDetails && (
                      <div className="text-xs bg-destructive/10 border border-destructive/20 rounded p-2 space-y-1">
                        <p className="text-destructive font-medium">{fileData.errorDetails.message}</p>
                        {fileData.errorDetails.statusCode && (
                          <p className="text-muted-foreground">Status: {fileData.errorDetails.statusCode}</p>
                        )}
                        <p className="text-muted-foreground">Time: {new Date(fileData.errorDetails.timestamp).toLocaleTimeString()}</p>
                      </div>
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Manage Database Files
              </CardTitle>
              <CardDescription>
                View, download, rename, preview, and delete uploaded database files
              </CardDescription>
            </div>
            {storedFiles.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={toggleSelectAll}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  {selectedFiles.size === storedFiles.length ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  {selectedFiles.size === storedFiles.length ? 'Deselect All' : 'Select All'}
                </Button>
                {selectedFiles.size > 0 && (
                  <Button
                    onClick={handleBulkDelete}
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete {selectedFiles.size} file(s)
                  </Button>
                )}
              </div>
            )}
          </div>
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
              {storedFiles.map((file) => {
                const vapiSync = vapiSyncData[file.id];
                const isSynced = vapiSync && vapiSync.status === 'synced' && vapiSync.vapi_file_id;
                const hasSyncError = vapiSync && vapiSync.status === 'error';
                
                return (
                  <div
                    key={file.id}
                    className={`flex items-center gap-3 p-4 rounded-lg bg-card border transition-all duration-200 ${
                      selectedFiles.has(file.id) 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <Checkbox
                      checked={selectedFiles.has(file.id)}
                      onCheckedChange={() => toggleFileSelection(file.id)}
                      className="flex-shrink-0"
                    />
                    <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {file.file_name || "Unnamed file"}
                        </p>
                        {isSynced && (
                          <Badge variant="secondary" className="gap-1 text-xs bg-success/10 text-success border-success/20">
                            <Cloud className="w-3 h-3" />
                            Synced to Vapi
                          </Badge>
                        )}
                        {hasSyncError && (
                          <Badge variant="destructive" className="gap-1 text-xs">
                            <CloudOff className="w-3 h-3" />
                            Sync Error
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)} • {formatDate(file.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {vapiSync && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openSyncHistory(file)}
                          className="hover:bg-primary/10 hover:text-primary"
                          title="View sync history"
                        >
                          <History className="w-4 h-4" />
                        </Button>
                      )}
                      <FileSyncButton
                        fileId={file.id}
                        fileName={file.file_name || "Unnamed file"}
                        onSyncComplete={() => {
                          fetchStoredFiles();
                          fetchVapiSyncStatus();
                        }}
                      />
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
                );
              })}
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

      {/* Sync History Dialog */}
      <Dialog open={syncHistoryDialog.open} onOpenChange={(open) => setSyncHistoryDialog({ open, file: null, history: null })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Vapi Sync History: {syncHistoryDialog.file?.file_name}
            </DialogTitle>
            <DialogDescription>
              View the synchronization history and status for this file
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {!syncHistoryDialog.history ? (
              <div className="text-center py-8 text-muted-foreground">
                <CloudOff className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Not synced to Vapi</p>
                <p className="text-sm mt-2">This file has not been uploaded to Vapi yet.</p>
                <p className="text-sm mt-1">Click the sync button to upload it.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Status Badge */}
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground mb-1">Current Status</p>
                    {syncHistoryDialog.history.status === 'synced' && syncHistoryDialog.history.vapi_file_id ? (
                      <Badge variant="secondary" className="gap-1 bg-success/10 text-success border-success/20">
                        <Cloud className="w-3 h-3" />
                        Synced Successfully
                      </Badge>
                    ) : syncHistoryDialog.history.status === 'error' ? (
                      <Badge variant="destructive" className="gap-1">
                        <CloudOff className="w-3 h-3" />
                        Sync Failed
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {syncHistoryDialog.history.status}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Sync Details */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Vapi File ID</p>
                      <p className="text-sm font-mono text-foreground">
                        {syncHistoryDialog.history.vapi_file_id || 'N/A'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Local File ID</p>
                      <p className="text-sm font-mono text-foreground">
                        {syncHistoryDialog.history.local_file_id?.slice(0, 8)}...
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Synced At</p>
                      <p className="text-sm text-foreground">
                        {formatDate(syncHistoryDialog.history.created_at)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Last Updated</p>
                      <p className="text-sm text-foreground">
                        {formatDate(syncHistoryDialog.history.updated_at)}
                      </p>
                    </div>
                  </div>

                  {syncHistoryDialog.history.error_message && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Error Message</p>
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                        <p className="text-sm text-destructive">
                          {syncHistoryDialog.history.error_message}
                        </p>
                      </div>
                    </div>
                  )}

                  {syncHistoryDialog.history.vapi_file_id && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Vapi URL</p>
                      <p className="text-sm font-mono text-primary break-all">
                        https://api.vapi.ai/file/{syncHistoryDialog.history.vapi_file_id}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setSyncHistoryDialog({ open: false, file: null, history: null })}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DatabaseFileManager;
