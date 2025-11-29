import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AnalyticsData {
  totalUploads: number;
  successfulUploads: number;
  failedUploads: number;
  successRate: number;
  averageRetries: number;
  commonErrors: { error: string; count: number }[];
}

const UploadAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalUploads: 0,
    successfulUploads: 0,
    failedUploads: 0,
    successRate: 0,
    averageRetries: 0,
    commonErrors: [],
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data, error } = await supabase
        .from("file_upload_history")
        .select("*");

      if (error) throw error;

      if (data) {
        const totalUploads = data.length;
        const successfulUploads = data.filter(
          (d) => d.upload_status === "success"
        ).length;
        const failedUploads = data.filter(
          (d) => d.upload_status === "failed"
        ).length;
        const successRate =
          totalUploads > 0 ? (successfulUploads / totalUploads) * 100 : 0;
        
        const totalRetries = data.reduce((sum, d) => sum + (d.retry_count || 0), 0);
        const averageRetries = totalUploads > 0 ? totalRetries / totalUploads : 0;

        // Get common errors
        const errorMap = new Map<string, number>();
        data.forEach((d) => {
          if (d.error_message) {
            const error = d.error_message.substring(0, 100); // Truncate long errors
            errorMap.set(error, (errorMap.get(error) || 0) + 1);
          }
        });

        const commonErrors = Array.from(errorMap.entries())
          .map(([error, count]) => ({ error, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setAnalytics({
          totalUploads,
          successfulUploads,
          failedUploads,
          successRate,
          averageRetries,
          commonErrors,
        });
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-card border-border/50 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Uploads
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {analytics.totalUploads}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All upload attempts
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Successful
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {analytics.successfulUploads}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.successRate.toFixed(1)}% success rate
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Failed
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {analytics.failedUploads}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {((analytics.failedUploads / analytics.totalUploads) * 100 || 0).toFixed(1)}% failure rate
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Retries
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {analytics.averageRetries.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Average retry attempts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Common Errors */}
      {analytics.commonErrors.length > 0 && (
        <Card className="bg-gradient-card border-border/50 shadow-elegant">
          <CardHeader>
            <CardTitle className="text-foreground">Common Error Patterns</CardTitle>
            <CardDescription>Most frequent upload errors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.commonErrors.map((error, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border"
                >
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground break-words">
                      {error.error}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Occurred {error.count} time{error.count > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UploadAnalytics;
