import DashboardLayout from "@/components/DashboardLayout";
import { PageTransition } from "@/components/PageTransition";
import { ProtectedFeature } from "@/components/ProtectedFeature";
import KnowledgeBaseManager from "@/components/knowledge-base/KnowledgeBaseManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, AlertCircle } from "lucide-react";

const KnowledgeBase = () => {
  return (
    <DashboardLayout>
      <PageTransition>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <BookOpen className="w-8 h-8 text-primary" />
                Knowledge Base Manager
              </h1>
              <p className="text-muted-foreground mt-2">
                Create and manage AI knowledge bases with your uploaded files
              </p>
            </div>
          </div>

          <ProtectedFeature 
            allowedRoles={["owner", "admin"]}
            fallback={
              <Card className="bg-gradient-card border-border/50 shadow-elegant">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <AlertCircle className="w-5 h-5 text-warning" />
                    Access Restricted
                  </CardTitle>
                  <CardDescription>
                    Knowledge base management is only available to Owners and Administrators
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Please contact your system administrator if you need access to this feature.
                  </p>
                </CardContent>
              </Card>
            }
          >
            <KnowledgeBaseManager />
          </ProtectedFeature>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
};

export default KnowledgeBase;
