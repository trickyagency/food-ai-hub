import { ReactNode } from "react";
import { useUserRole, UserRole } from "@/hooks/useUserRole";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

interface ProtectedFeatureProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  fallback?: ReactNode;
}

export const ProtectedFeature = ({
  children,
  allowedRoles,
  fallback,
}: ProtectedFeatureProps) => {
  const { role, loading } = useUserRole();

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (!role || !allowedRoles.includes(role)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ShieldAlert className="h-8 w-8" />
            <p className="text-center">
              You don't have permission to access this feature
            </p>
            <p className="text-sm text-center">
              Required role: {allowedRoles.join(", ")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
};
