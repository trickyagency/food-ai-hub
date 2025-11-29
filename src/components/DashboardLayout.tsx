import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { NavLink } from "./NavLink";
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
    label: "Upload",
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
      <aside className="w-56 border-r border-border/60 flex flex-col bg-sidebar shadow-sm">
        <div className="p-5 border-b border-border/60">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-md">
              <LayoutDashboard className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-sidebar-foreground tracking-tight">VOICE AI</h1>
              <p className="text-[10px] text-muted-foreground font-medium">Food Business</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(item => {
          const Icon = item.icon;
          return <NavLink 
                key={item.path} 
                to={item.path} 
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200" 
                activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold shadow-sm border border-border/40"
              >
                <Icon className="w-[18px] h-[18px]" />
                <span>{item.label}</span>
              </NavLink>;
        })}
        </nav>

        <div className="p-3 border-t border-border/60 space-y-2.5">
          <div className="px-3 py-2">
            <p className="text-xs font-semibold text-sidebar-foreground truncate">{user?.email}</p>
            {userRole && (
              <span className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-primary/10 text-primary border border-primary/20">
                <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                {userRole}
              </span>
            )}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLogout} 
            className="w-full text-xs h-8 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
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