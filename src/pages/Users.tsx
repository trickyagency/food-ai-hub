import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

interface UserRole {
  role: string;
}

interface UserWithRole extends UserProfile {
  role: string;
}

const Users = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("viewer");
  const [isAddingUser, setIsAddingUser] = useState(false);

  useEffect(() => {
    fetchCurrentUserRole();
    fetchUsers();
  }, []);

  const fetchCurrentUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      setCurrentUserRole(data?.role || null);
    }
  };

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

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from("user_roles")
        .insert([{ user_id: userId, role: newRole as any }]);

      if (insertError) throw insertError;

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

      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) throw error;

      toast.success("User deleted successfully");
      fetchUsers();
    } catch (error: any) {
      toast.error("Failed to delete user: " + error.message);
    }
  };

  const addNewUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      toast.error("Email and password are required");
      return;
    }

    setIsAddingUser(true);
    try {
      // Create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("User creation failed");

      // Assign role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert([{ user_id: authData.user.id, role: newUserRole as any }]);

      if (roleError) throw roleError;

      toast.success("User created successfully");
      setIsAddUserOpen(false);
      setNewUserEmail("");
      setNewUserPassword("");
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
      case "staff":
        return "outline";
      case "viewer":
        return "outline";
      default:
        return "outline";
    }
  };

  const canManageUser = (userRole: string) => {
    if (currentUserRole === "owner") return true;
    if (currentUserRole === "admin" && userRole !== "owner" && userRole !== "admin") return true;
    return false;
  };

  if (!currentUserRole || (currentUserRole !== "owner" && currentUserRole !== "admin")) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                You don't have permission to access this page.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground">Manage user roles and permissions</p>
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
                  Create a new user account with a specific role
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
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Temporary Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    disabled={isAddingUser}
                    minLength={6}
                  />
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
                        <>
                          <SelectItem value="admin">Admin</SelectItem>
                        </>
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

        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              View and manage user accounts and their roles
            </CardDescription>
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
                        {canManageUser(user.role) ? (
                          <Select
                            value={user.role}
                            onValueChange={(value) => updateUserRole(user.id, value)}
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
                        {canManageUser(user.role) && (
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
      </div>
    </DashboardLayout>
  );
};

export default Users;
