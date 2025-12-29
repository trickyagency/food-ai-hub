import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { PageTransition } from "@/components/PageTransition";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Shield, Users as UsersIcon, FileText, Bell, Activity, Phone } from "lucide-react";
import ProfileSettings from "@/components/settings/ProfileSettings";
import SecuritySettings from "@/components/settings/SecuritySettings";
import UserManagement from "@/components/settings/UserManagement";
import AuditLogViewer from "@/components/settings/AuditLogViewer";
import EmailNotifications from "@/components/settings/EmailNotifications";
import UserActivityDashboard from "@/components/settings/UserActivityDashboard";
import VapiSettings from "@/components/settings/VapiSettings";
import RolePermissionsSummary from "@/components/settings/RolePermissionsSummary";

import { useUserRole } from "@/hooks/useUserRole";

const Settings = () => {
  const { canManageUsers, role } = useUserRole();
  const [activeTab, setActiveTab] = useState("profile");
  const isAdminOrOwner = role === "admin" || role === "owner";

  return (
    <DashboardLayout>
      <PageTransition>
      <div className="p-6 sm:p-8 lg:p-10 space-y-8 max-w-[1800px] mx-auto">
        <div className="space-y-3 pb-6 border-b border-border/50">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">Settings</h1>
          <p className="text-base text-muted-foreground">Manage your account settings and preferences</p>
        </div>

        <RolePermissionsSummary />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="profile" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="voice-ai" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">Voice AI</span>
            </TabsTrigger>
            {canManageUsers && (
              <TabsTrigger value="users" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <UsersIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>
            )}
            {isAdminOrOwner && (
              <>
                <TabsTrigger value="activity" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Activity className="h-4 w-4" />
                  <span className="hidden sm:inline">Activity</span>
                </TabsTrigger>
                <TabsTrigger value="audit" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Audit Logs</span>
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

          <TabsContent value="voice-ai">
            <VapiSettings />
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
      </PageTransition>
    </DashboardLayout>
  );
};

export default Settings;
