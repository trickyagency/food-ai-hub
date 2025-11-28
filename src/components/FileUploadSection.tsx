import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, File, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const WEBHOOK_URL = "https://digitalautomators.app.n8n.cloud/webhook-test/5914daf9-cbd1-40e2-81d0-8144944abcfc";

interface UploadedFile {
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
}

const FileUploadSection = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      status: "pending" as const,
      progress: 0,
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json'],
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
    },
  });

  const uploadFile = async (index: number) => {
    const fileData = files[index];
    setFiles(prev => prev.map((f, i) => i === index ? { ...f, status: "uploading" as const } : f));

    const formData = new FormData();
    formData.append('file', fileData.file);

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setFiles(prev => prev.map((f, i) => i === index ? { ...f, status: "success" as const, progress: 100 } : f));
        toast.success(`${fileData.file.name} uploaded successfully`);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      setFiles(prev => prev.map((f, i) => i === index ? { ...f, status: "error" as const } : f));
      toast.error(`Failed to upload ${fileData.file.name}`);
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

  return (
    <Card className="bg-gradient-card border-border/50 shadow-elegant">
      <CardHeader>
        <CardTitle className="text-foreground">Upload Database Files</CardTitle>
        <CardDescription>Upload your food business data files to sync with the AI agent</CardDescription>
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
              <p className="text-sm text-muted-foreground">Supports: JSON, CSV, Excel, TXT</p>
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
                    <p className="text-xs text-muted-foreground">{(fileData.file.size / 1024).toFixed(2)} KB</p>
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
  );
};

export default FileUploadSection;
