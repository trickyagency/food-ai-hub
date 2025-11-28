import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Shield, Users as UsersIcon, FileText, Bell, Activity } from "lucide-react";
import ProfileSettings from "@/components/settings/ProfileSettings";
import SecuritySettings from "@/components/settings/SecuritySettings";
import UserManagement from "@/components/settings/UserManagement";
import AuditLogViewer from "@/components/settings/AuditLogViewer";
import EmailNotifications from "@/components/settings/EmailNotifications";
import UserActivityDashboard from "@/components/settings/UserActivityDashboard";
import { useUserRole } from "@/hooks/useUserRole";

const Settings = () => {
  const { canManageUsers, role } = useUserRole();
  const [activeTab, setActiveTab] = useState("profile");
  const isAdminOrOwner = role === "admin" || role === "owner";

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            {canManageUsers && (
              <TabsTrigger value="users" className="flex items-center gap-2">
                <UsersIcon className="h-4 w-4" />
                User Management
              </TabsTrigger>
            )}
            {isAdminOrOwner && (
              <>
                <TabsTrigger value="activity" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  User Activity
                </TabsTrigger>
                <TabsTrigger value="audit" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Audit Logs
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="profile">
            <ProfileSettings />
          </TabsContent>

          <TabsContent value="security">
            <SecuritySettings />
          </TabsContent>

          <TabsContent value="notifications">
            <EmailNotifications />
          </TabsContent>

          {canManageUsers && (
            <TabsContent value="users">
              <UserManagement />
            </TabsContent>
          )}

          {isAdminOrOwner && (
            <>
              <TabsContent value="activity">
                <UserActivityDashboard />
              </TabsContent>

              <TabsContent value="audit">
                <AuditLogViewer />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
