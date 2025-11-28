import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { NavLink } from "./NavLink";
import { LayoutDashboard, Upload, LogOut, Users, LucideIcon } from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
}

interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        setUserRole(data?.role || null);
      }
    };
    fetchUserRole();
  }, [user]);

  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: Upload, label: "Upload", path: "/upload" },
  ];

  if (userRole === "owner" || userRole === "admin") {
    navItems.push({ icon: Users, label: "Users", path: "/users" });
  }

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <LayoutDashboard className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">AI Agent Admin</h1>
              <p className="text-xs text-muted-foreground">Food Business</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-accent transition-colors"
                activeClassName="bg-accent font-medium"
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          <div className="text-sm">
            <p className="font-medium text-foreground truncate">{user?.email}</p>
            {userRole && (
              <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="w-full"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
