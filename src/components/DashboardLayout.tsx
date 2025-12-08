import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { NavLink } from "./NavLink";
import { ThemeToggle } from "./ThemeToggle";
import { LayoutDashboard, Upload, LogOut, Settings, LucideIcon, Menu, BookOpen, MessageSquare, ShoppingCart } from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
}

interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
  requiredPermission?: "canManageFiles" | "canManageKnowledgeBase" | "canViewReports";
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { role, canManageFiles, canManageKnowledgeBase, canViewReports } = useUserRole();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const allNavItems: NavItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: Upload, label: "Database Files", path: "/upload", requiredPermission: "canManageFiles" },
    { icon: BookOpen, label: "Knowledge Base", path: "/knowledge-base", requiredPermission: "canManageKnowledgeBase" },
    { icon: MessageSquare, label: "SMS History", path: "/sms-history", requiredPermission: "canViewReports" },
    { icon: ShoppingCart, label: "Orders", path: "/orders", requiredPermission: "canViewReports" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  // Filter nav items based on user permissions
  const navItems = allNavItems.filter((item) => {
    if (!item.requiredPermission) return true;
    if (item.requiredPermission === "canManageFiles") return canManageFiles;
    if (item.requiredPermission === "canManageKnowledgeBase") return canManageKnowledgeBase;
    if (item.requiredPermission === "canViewReports") return canViewReports;
    return true;
  });

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
  };

  const SidebarContent = () => (
    <>
      <div className="p-4 sm:p-6 border-b border-border">
        <Link to="/" className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
            <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-sm sm:text-base text-foreground tracking-tight">VOICE AI</h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Smartflow Automation</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 sm:p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-sm text-foreground hover:bg-muted transition-all duration-200"
              activeClassName="bg-primary text-primary-foreground font-semibold shadow-md"
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 sm:p-4 border-t border-border space-y-3">
        <ThemeToggle />

        <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-muted/50 rounded-lg">
          <p className="text-xs sm:text-sm font-semibold text-foreground truncate">{user?.email}</p>
          {role && (
            <span className="inline-flex items-center gap-1.5 mt-2 px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wide bg-primary/10 text-primary border border-primary/20">
              {role}
            </span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout} className="w-full text-sm">
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </>
  );
  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-card border-b border-border flex items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-md">
            <LayoutDashboard className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-foreground">VOICE AI</h1>
          </div>
        </Link>

        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex flex-col h-full">
              <SidebarContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-border flex-col bg-card shadow-sm">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-background pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  );
};
export default DashboardLayout;