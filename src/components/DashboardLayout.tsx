import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { NavLink } from "./NavLink";
import { ThemeToggle } from "./ThemeToggle";
import { LayoutDashboard, Upload, LogOut, Settings, LucideIcon } from "lucide-react";
interface DashboardLayoutProps {
  children: ReactNode;
}
interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
}
const DashboardLayout = ({
  children
}: DashboardLayoutProps) => {
  const {
    user,
    logout
  } = useAuth();
  const location = useLocation();
  const [userRole, setUserRole] = useState<string | null>(null);
  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        const {
          data
        } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
        setUserRole(data?.role || null);
      }
    };
    fetchUserRole();
  }, [user]);
  const navItems: NavItem[] = [{
    icon: LayoutDashboard,
    label: "Dashboard",
    path: "/"
  }, {
    icon: Upload,
    label: "Database Files",
    path: "/upload"
  }, {
    icon: Settings,
    label: "Settings",
    path: "/settings"
  }];
  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
  };
  return <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border flex flex-col bg-card shadow-sm">
        <div className="p-6 border-b border-border">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
              <LayoutDashboard className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-base text-foreground tracking-tight">Voice AI Agent</h1>
              <p className="text-xs text-muted-foreground font-medium">Call Analytics</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => {
          const Icon = item.icon;
          return <NavLink 
                key={item.path} 
                to={item.path} 
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-foreground hover:bg-muted transition-all duration-200" 
                activeClassName="bg-primary text-primary-foreground font-semibold shadow-md"
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>;
        })}
        </nav>

        <div className="p-4 border-t border-border space-y-3">
          <ThemeToggle />
          
          <div className="px-4 py-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-semibold text-foreground truncate">{user?.email}</p>
            {userRole && (
              <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide bg-primary/10 text-primary border border-primary/20">
                {userRole}
              </span>
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
      <main className="flex-1 overflow-auto bg-background">
        {children}
      </main>
    </div>;
};
export default DashboardLayout;