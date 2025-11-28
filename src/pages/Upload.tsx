import DashboardLayout from "@/components/DashboardLayout";
import FileUploadSection from "@/components/FileUploadSection";
import FileManager from "@/components/FileManager";
import VectorSearch from "@/components/VectorSearch";
import { ProtectedFeature } from "@/components/ProtectedFeature";
import { Upload as UploadIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

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

        {/* File Upload Section - Restricted to Admins only */}
        <ProtectedFeature
          allowedRoles={["owner", "admin"]}
          fallback={
            <Card>
              <CardContent className="py-16">
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                  <ShieldAlert className="h-12 w-12" />
                  <div className="text-center space-y-2">
                    <p className="text-lg font-medium">Upload Permission Required</p>
                    <p className="text-sm">
                      You don't have permission to upload files. Please contact your administrator
                      if you need access to this feature.
                    </p>
                    <p className="text-xs">
                      Required role: Admin or Owner
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          }
        >
          <FileUploadSection />
        </ProtectedFeature>

        {/* File Manager - Restricted to Admins only */}
        <ProtectedFeature allowedRoles={["owner", "admin"]}>
          <FileManager />
        </ProtectedFeature>

        {/* Vector Search - Restricted to Admins only */}
        <ProtectedFeature allowedRoles={["owner", "admin"]}>
          <VectorSearch />
        </ProtectedFeature>
      </div>
    </DashboardLayout>
  );
};

export default Upload;
