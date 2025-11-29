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
  return <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside className="w-56 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-slate-900 dark:bg-slate-100 flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-white dark:text-slate-900" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-slate-900 dark:text-slate-100 tracking-tight">VOICE AI</h1>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Food Business</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(item => {
          const Icon = item.icon;
          return <NavLink 
                key={item.path} 
                to={item.path} 
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200" 
                activeClassName="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold"
              >
                <Icon className="w-[18px] h-[18px]" />
                <span>{item.label}</span>
              </NavLink>;
        })}
        </nav>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
          <ThemeToggle />
          
          <div className="px-3 py-2">
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{user?.email}</p>
            {userRole && (
              <span className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {userRole}
              </span>
            )}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLogout} 
            className="w-full text-xs h-8"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950">
        {children}
      </main>
    </div>;
};
export default DashboardLayout;