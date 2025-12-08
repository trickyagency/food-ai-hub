import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUserRole } from "@/hooks/useUserRole";
import { CheckCircle2, XCircle, Shield } from "lucide-react";

const RolePermissionsSummary = () => {
  const {
    role,
    loading,
    canViewDashboard,
    canViewCallLogs,
    canViewReports,
    canMakeCalls,
    canManageFiles,
    canManageKnowledgeBase,
    canManageUsers,
    canAssignRoles,
    canViewActivityLogs,
  } = useUserRole();

  if (loading) {
    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" />
            Your Role & Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-32 bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const getRoleBadgeVariant = (role: string | null) => {
    switch (role) {
      case "owner":
        return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      case "admin":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "manager":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "staff":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "viewer":
        return "bg-slate-500/10 text-slate-600 border-slate-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const permissions = [
    {
      category: "Dashboard & Analytics",
      items: [
        { label: "View Dashboard Metrics", granted: canViewDashboard },
        { label: "View Call Logs", granted: canViewCallLogs },
        { label: "View Reports & Analytics", granted: canViewReports },
      ],
    },
    {
      category: "Call Management",
      items: [
        { label: "Make Outbound Calls", granted: canMakeCalls },
      ],
    },
    {
      category: "Administration",
      items: [
        { label: "Manage Database Files", granted: canManageFiles },
        { label: "Manage Knowledge Base", granted: canManageKnowledgeBase },
        { label: "Add & Delete Users", granted: canManageUsers },
        { label: "Assign User Roles", granted: canAssignRoles },
        { label: "View Activity & Audit Logs", granted: canViewActivityLogs },
      ],
    },
  ];

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" />
            Your Role & Permissions
          </CardTitle>
          <Badge 
            variant="outline" 
            className={`capitalize font-medium ${getRoleBadgeVariant(role)}`}
          >
            {role || "No Role"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 sm:grid-cols-3">
          {permissions.map((section) => (
            <div key={section.category} className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">
                {section.category}
              </h4>
              <ul className="space-y-2">
                {section.items.map((item) => (
                  <li key={item.label} className="flex items-center gap-2 text-sm">
                    {item.granted ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                    )}
                    <span className={item.granted ? "text-foreground" : "text-muted-foreground/70"}>
                      {item.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RolePermissionsSummary;
