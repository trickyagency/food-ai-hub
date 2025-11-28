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
import { Shield, User, Key, UserPlus, UserMinus, Calendar } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

interface AuditLog {
  id: string;
  user_id: string | null;
  event_type: string;
  event_details: any;
  created_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

const AuditLogViewer = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { role } = useUserRole();

  const isAdminOrOwner = role === "admin" || role === "owner";

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      toast.error("Failed to load audit logs: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType.toLowerCase()) {
      case "login":
      case "signin":
        return <User className="h-4 w-4" />;
      case "logout":
      case "signout":
        return <User className="h-4 w-4" />;
      case "password_change":
      case "password_reset":
        return <Key className="h-4 w-4" />;
      case "role_change":
      case "role_update":
        return <Shield className="h-4 w-4" />;
      case "user_created":
        return <UserPlus className="h-4 w-4" />;
      case "user_deleted":
        return <UserMinus className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getEventBadge = (eventType: string) => {
    const type = eventType.toLowerCase();
    if (type.includes("login") || type.includes("signin")) {
      return <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">Login</Badge>;
    }
    if (type.includes("logout") || type.includes("signout")) {
      return <Badge variant="outline" className="bg-gray-500/10 text-gray-700 dark:text-gray-400">Logout</Badge>;
    }
    if (type.includes("password")) {
      return <Badge variant="outline" className="bg-orange-500/10 text-orange-700 dark:text-orange-400">Password</Badge>;
    }
    if (type.includes("role")) {
      return <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-400">Role Change</Badge>;
    }
    if (type.includes("created")) {
      return <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400">Created</Badge>;
    }
    if (type.includes("deleted")) {
      return <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400">Deleted</Badge>;
    }
    return <Badge variant="outline">{eventType}</Badge>;
  };

  if (!isAdminOrOwner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
          <CardDescription>View system activity and security events</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8 text-muted-foreground">
            Only admins and owners can view audit logs
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Logs</CardTitle>
        <CardDescription>
          Track user activity including logins, password changes, and role modifications
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Loading audit logs...</p>
        ) : logs.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No audit logs found</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Event</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="w-[200px]">Timestamp</TableHead>
                  <TableHead className="w-[150px]">IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getEventIcon(log.event_type)}
                        {getEventBadge(log.event_type)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {log.event_details ? (
                          <pre className="text-xs text-muted-foreground overflow-auto max-w-md">
                            {JSON.stringify(log.event_details, null, 2)}
                          </pre>
                        ) : (
                          <span className="text-muted-foreground">No details</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm">
                          {new Date(log.created_at).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground font-mono">
                        {log.ip_address || "N/A"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AuditLogViewer;
