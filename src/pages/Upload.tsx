import DashboardLayout from "@/components/DashboardLayout";
import DatabaseFileManager from "@/components/DatabaseFileManager";
import { ProtectedFeature } from "@/components/ProtectedFeature";
import { PageTransition } from "@/components/PageTransition";
import { Database } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

const Upload = () => {
  return (
    <DashboardLayout>
      <PageTransition>
      <div className="p-6 sm:p-8 lg:p-10 space-y-8 max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="space-y-3 pb-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-sm">
              <Database className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">Database Files</h1>
              <p className="text-base text-muted-foreground">Manage and organize your food business database files</p>
            </div>
          </div>
        </div>

        {/* Database File Manager - Restricted to Admins only */}
        <ProtectedFeature
          allowedRoles={["owner", "admin"]}
          fallback={
            <Card>
              <CardContent className="py-16">
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                  <ShieldAlert className="h-12 w-12" />
                  <div className="text-center space-y-2">
                    <p className="text-lg font-medium">Admin Access Required</p>
                    <p className="text-sm">
                      You don't have permission to manage database files. Please contact your administrator
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
          <DatabaseFileManager />
        </ProtectedFeature>
      </div>
      </PageTransition>
    </DashboardLayout>
  );
};

export default Upload;
