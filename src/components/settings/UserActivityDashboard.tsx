import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Clock, Activity, Shield, History } from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UserActivity {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  last_login: string | null;
  total_logins: number;
  account_created: string;
}

interface RoleHistoryEntry {
  id: string;
  user_id: string;
  old_role: string | null;
  new_role: string;
  changed_by: string;
  changed_at: string;
  notes: string | null;
  changed_by_email: string;
}

const UserActivityDashboard = () => {
  const [users, setUsers] = useState<UserActivity[]>([]);
  const [roleHistory, setRoleHistory] = useState<RoleHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  useEffect(() => {
    fetchUserActivity();
    fetchRoleHistory();
  }, []);

  const fetchUserActivity = async () => {
    setLoading(true);
    try {
      // Fetch user profiles with roles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      if (profiles) {
        const usersWithActivity = await Promise.all(
          profiles.map(async (profile) => {
            const { data: roleData } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", profile.id)
              .single();

            // Get login count from audit logs
            const { count: loginCount } = await supabase
              .from("audit_logs")
              .select("*", { count: "exact", head: true })
              .eq("user_id", profile.id)
              .eq("event_type", "login");

            // Get last login from audit logs
            const { data: lastLoginData } = await supabase
              .from("audit_logs")
              .select("created_at")
              .eq("user_id", profile.id)
              .eq("event_type", "login")
              .order("created_at", { ascending: false })
              .limit(1)
              .single();

            return {
              id: profile.id,
              email: profile.email || "",
              full_name: profile.full_name,
              role: roleData?.role || "staff",
              last_login: lastLoginData?.created_at || null,
              total_logins: loginCount || 0,
              account_created: profile.created_at || "",
            };
          })
        );

        setUsers(usersWithActivity);
      }
    } catch (error: any) {
      toast.error("Failed to load user activity: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoleHistory = async (userId?: string) => {
    try {
      let query = supabase
        .from("user_role_history")
        .select("*")
        .order("changed_at", { ascending: false });

      if (userId) {
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;

      if (data) {
        // Fetch profiles for changed_by users
        const changedByIds = [...new Set(data.map(entry => entry.changed_by))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", changedByIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.email]) || []);

        const formattedHistory = data.map((entry: any) => ({
          id: entry.id,
          user_id: entry.user_id,
          old_role: entry.old_role,
          new_role: entry.new_role,
          changed_by: entry.changed_by,
          changed_at: entry.changed_at,
          notes: entry.notes,
          changed_by_email: profileMap.get(entry.changed_by) || "Unknown",
        }));

        setRoleHistory(formattedHistory);
      }
    } catch (error: any) {
      toast.error("Failed to load role history: " + error.message);
    }
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUser(userId);
    fetchRoleHistory(userId);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
        return "default";
      case "admin":
        return "secondary";
      case "manager":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          User Activity Dashboard
        </CardTitle>
        <CardDescription>
          Monitor user activity, login history, and role changes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="activity" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="activity">User Activity</TabsTrigger>
            <TabsTrigger value="history">Role History</TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="space-y-4">
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading activity...</p>
            ) : (
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Total Logins</TableHead>
                      <TableHead>Account Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.email}</p>
                            {user.full_name && (
                              <p className="text-sm text-muted-foreground">{user.full_name}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            <Shield className="h-3 w-3 mr-1" />
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.last_login ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              {format(new Date(user.last_login), "MMM dd, yyyy HH:mm")}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Never</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.total_logins}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(user.account_created), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => handleUserSelect(user.id)}
                            className="text-sm text-primary hover:underline"
                          >
                            View History
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {selectedUser && (
              <div className="mb-4 p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">
                  Showing history for: {users.find(u => u.id === selectedUser)?.email}
                </p>
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    fetchRoleHistory();
                  }}
                  className="text-sm text-primary hover:underline mt-1"
                >
                  Show all users
                </button>
              </div>
            )}

            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Old Role</TableHead>
                    <TableHead>New Role</TableHead>
                    <TableHead>Changed By</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roleHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No role changes recorded yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    roleHistory.map((entry) => {
                      const user = users.find(u => u.id === entry.user_id);
                      return (
                        <TableRow key={entry.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{user?.email || "Unknown"}</p>
                              {user?.full_name && (
                                <p className="text-sm text-muted-foreground">{user.full_name}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {entry.old_role ? (
                              <Badge variant={getRoleBadgeVariant(entry.old_role)}>
                                {entry.old_role}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(entry.new_role)}>
                              {entry.new_role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {entry.changed_by_email}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <History className="h-3 w-3 text-muted-foreground" />
                              {format(new Date(entry.changed_at), "MMM dd, yyyy HH:mm")}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default UserActivityDashboard;
