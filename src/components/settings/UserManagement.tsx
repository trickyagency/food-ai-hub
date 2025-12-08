import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Shield, UserPlus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useUserRole } from "@/hooks/useUserRole";
import { auditLog } from "@/lib/auditLog";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

interface UserWithRole extends UserProfile {
  role: string;
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const { role: currentUserRole } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("viewer");
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [pendingRoleChange, setPendingRoleChange] = useState<{ userId: string; newRole: string; userEmail: string } | null>(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      if (profiles) {
        const usersWithRoles = await Promise.all(
          profiles.map(async (profile) => {
            const { data: roleData } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", profile.id)
              .single();

            return {
              ...profile,
              role: roleData?.role || "staff",
            };
          })
        );

        setUsers(usersWithRoles);
      }
    } catch (error: any) {
      toast.error("Failed to load users: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChangeRequest = (userId: string, newRole: string) => {
    // If promoting to admin, show confirmation dialog
    if (newRole === "admin" && currentUserRole === "owner") {
      const user = users.find(u => u.id === userId);
      if (user) {
        setPendingRoleChange({ userId, newRole, userEmail: user.email });
        return;
      }
    }
    // For non-admin roles, proceed directly
    updateUserRole(userId, newRole);
  };

  const confirmRoleChange = () => {
    if (pendingRoleChange) {
      updateUserRole(pendingRoleChange.userId, pendingRoleChange.newRole);
      setPendingRoleChange(null);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      // Get current user for logging
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Prevent users from changing their own role
      if (user.id === userId) {
        toast.error("You cannot change your own role");
        return;
      }

      // Get current user's profile email for audit log
      const { data: currentUserProfile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", user.id)
        .single();

      // Get current role before updating
      const currentUser = users.find(u => u.id === userId);
      const oldRole = currentUser?.role || null;

      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from("user_roles")
        .insert([{ user_id: userId, role: newRole as any }]);

      if (insertError) throw insertError;

      // Log to role history table
      const { error: historyError } = await supabase
        .from("user_role_history")
        .insert([{
          user_id: userId,
          old_role: oldRole as any,
          new_role: newRole as any,
          changed_by: user.id,
        }]);

      if (historyError) console.error("Failed to log role history:", historyError);

      // Log the role change to audit logs with changed_by information
      await auditLog.roleChange(
        userId, 
        oldRole || "unknown", 
        newRole,
        user.id,
        currentUserProfile?.email || undefined
      );

      toast.success("User role updated successfully");
      fetchUsers();
    } catch (error: any) {
      toast.error("Failed to update role: " + error.message);
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user?.id === userId) {
        toast.error("You cannot delete your own account");
        return;
      }

      // Get user email before deletion
      const deletedUser = users.find(u => u.id === userId);
      const email = deletedUser?.email || "unknown";

      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Not authenticated");
        return;
      }

      // Call edge function to delete user
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Log the user deletion
      await auditLog.userDeleted(userId, email);

      toast.success("User deleted successfully");
      fetchUsers();
    } catch (error: any) {
      toast.error("Failed to delete user: " + error.message);
    }
  };

  const addNewUser = async () => {
    if (!newUserEmail) {
      toast.error("Email is required");
      return;
    }

    setIsAddingUser(true);
    try {
      // Create user with a random temporary password they won't use
      const tempPassword = Math.random().toString(36).slice(-16) + Math.random().toString(36).slice(-16);
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUserEmail,
        password: tempPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            setup_required: true
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("User creation failed");

      // Assign role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert([{ user_id: authData.user.id, role: newUserRole as any }]);

      if (roleError) throw roleError;

      // Log the user creation
      await auditLog.userCreated(authData.user.id, newUserEmail);

      // Send password reset email for account setup
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        newUserEmail,
        {
          redirectTo: `${window.location.origin}/auth`,
        }
      );

      if (resetError) {
        console.error("Failed to send setup email:", resetError);
        toast.warning("User created but setup email failed. Please resend manually.");
      } else {
        toast.success("User created! Setup email sent to " + newUserEmail);
      }

      setIsAddUserOpen(false);
      setNewUserEmail("");
      setNewUserRole("viewer");
      fetchUsers();
    } catch (error: any) {
      toast.error("Failed to create user: " + error.message);
    } finally {
      setIsAddingUser(false);
    }
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

  const canManageUser = (userId: string, userRole: string) => {
    // Cannot manage own role
    if (userId === currentUserId) return false;
    // Only owners can manage users
    if (currentUserRole === "owner") return true;
    return false;
  };

  return (
    <>
      {/* Admin Promotion Confirmation Dialog */}
      <AlertDialog open={!!pendingRoleChange} onOpenChange={(open) => !open && setPendingRoleChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" />
              Promote to Admin Role?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You are about to promote <span className="font-semibold text-foreground">{pendingRoleChange?.userEmail}</span> to <span className="font-semibold text-foreground">Admin</span>.
              </p>
              <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
                <p className="font-semibold text-foreground">Admin users will have elevated permissions to:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Add and manage users</li>
                  <li>Assign roles (Manager, Staff, Viewer)</li>
                  <li>View all audit logs and user activity</li>
                  <li>Access sensitive data and settings</li>
                  <li>Delete non-privileged users</li>
                </ul>
              </div>
              <p className="text-destructive font-medium">
                ⚠️ Only promote trusted users to this role.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange} className="bg-destructive hover:bg-destructive/90">
              Confirm Promotion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage user accounts and their permissions</CardDescription>
          </div>

          <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>
                  User will receive an email to set up their account and password
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    disabled={isAddingUser}
                  />
                  <p className="text-xs text-muted-foreground">
                    A setup email will be sent to this address
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={newUserRole}
                    onValueChange={setNewUserRole}
                    disabled={isAddingUser}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currentUserRole === "owner" && (
                        <SelectItem value="admin">Admin</SelectItem>
                      )}
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={addNewUser}
                  disabled={isAddingUser}
                  className="w-full"
                >
                  {isAddingUser ? "Creating..." : "Create User"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Loading users...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{user.full_name || "-"}</TableCell>
                  <TableCell>
                    {canManageUser(user.id, user.role) ? (
                      <Select
                        value={user.role}
                        onValueChange={(value) => handleRoleChangeRequest(user.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {currentUserRole === "owner" && (
                            <>
                              <SelectItem value="owner">Owner</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </>
                          )}
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        <Shield className="h-3 w-3 mr-1" />
                        {user.role}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {canManageUser(user.id, user.role) && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete User</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this user? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteUser(user.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
    </>
  );
};

export default UserManagement;
