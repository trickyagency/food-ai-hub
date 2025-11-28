import { ReactNode } from "react";
import { Phone, Upload, BarChart3, Settings, FileText, LogOut } from "lucide-react";
import { NavLink } from "./NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "./ui/button";
import { toast } from "sonner";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
  };

  const navItems = [
    { icon: BarChart3, label: "Overview", path: "/" },
    { icon: Phone, label: "Call Logs", path: "/calls" },
    { icon: Upload, label: "Upload Data", path: "/upload" },
    { icon: Settings, label: "Agent Config", path: "/config" },
    { icon: FileText, label: "Reports", path: "/reports" },
  ];

  return (
    <div className="flex min-h-screen bg-background dark">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
              <Phone className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-sidebar-foreground text-lg">AI Caller</h1>
              <p className="text-xs text-muted-foreground">Food Business</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200"
              activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm">
              <p className="font-medium text-sidebar-foreground truncate">{user?.email}</p>
              <p className="text-xs text-muted-foreground">Admin</p>
            </div>
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
