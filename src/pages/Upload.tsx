import DashboardLayout from "@/components/DashboardLayout";
import FileUploadSection from "@/components/FileUploadSection";
import { Upload as UploadIcon } from "lucide-react";

const Upload = () => {
  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <UploadIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-foreground">Upload Data</h1>
              <p className="text-muted-foreground">Manage your food business database files</p>
            </div>
          </div>
        </div>

        {/* File Upload Section */}
        <FileUploadSection />
      </div>
    </DashboardLayout>
  );
};

export default Upload;
