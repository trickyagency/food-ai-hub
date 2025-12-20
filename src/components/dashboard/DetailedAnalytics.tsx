import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VapiCall } from "@/hooks/useVapiCalls";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Clock, TrendingUp, Users, Phone } from "lucide-react";
import { format, parseISO, getHours } from "date-fns";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CallTag {
  satisfaction_rating: number | null;
  category: string;
}

interface DetailedAnalyticsProps {
  calls: VapiCall[];
}

const DetailedAnalytics = ({ calls }: DetailedAnalyticsProps) => {
  const { user } = useAuth();
  const [callTags, setCallTags] = useState<Record<string, CallTag>>({});

  useEffect(() => {
    if (user) {
      fetchCallTags();
    }
  }, [user, calls]);

  const fetchCallTags = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("call_tags")
      .select("call_id, satisfaction_rating, category")
      .eq("user_id", user.id);

    if (!error && data) {
      const tagsMap: Record<string, CallTag> = {};
      data.forEach((tag) => {
        tagsMap[tag.call_id] = {
          satisfaction_rating: tag.satisfaction_rating,
          category: tag.category,
        };
      });
      setCallTags(tagsMap);
    }
  };

  // Peak call times analysis (by hour)
  const peakTimesData = calls.reduce((acc, call) => {
    const hour = getHours(parseISO(call.createdAt));
    const hourLabel = `${hour}:00`;
    const existing = acc.find((d) => d.hour === hourLabel);
    if (existing) {
      existing.calls += 1;
    } else {
      acc.push({ hour: hourLabel, calls: 1 });
    }
    return acc;
  }, [] as { hour: string; calls: number }[]);

  // Sort by hour
  peakTimesData.sort((a, b) => {
    const hourA = parseInt(a.hour.split(":")[0]);
    const hourB = parseInt(b.hour.split(":")[0]);
    return hourA - hourB;
  });

  // Average response rate (calls answered vs missed)
  const totalCalls = calls.length;
  const answeredCalls = calls.filter(
    (call) => call.status === "ended" && call.endedReason !== "customer-did-not-answer"
  ).length;
  const responseRate = totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0;

  // Customer satisfaction metrics (from tagged calls)
  const taggedCalls = calls.filter((call) => callTags[call.id]?.satisfaction_rating);
  const avgSatisfaction =
    taggedCalls.length > 0
      ? taggedCalls.reduce((sum, call) => sum + (callTags[call.id]?.satisfaction_rating || 0), 0) /
        taggedCalls.length
      : 0;

  const satisfactionDistribution = [
    { rating: "1 Star", count: 0, color: "#EF4444" },
    { rating: "2 Stars", count: 0, color: "#F59E0B" },
    { rating: "3 Stars", count: 0, color: "#F59E0B" },
    { rating: "4 Stars", count: 0, color: "#10B981" },
    { rating: "5 Stars", count: 0, color: "#10B981" },
  ];

  taggedCalls.forEach((call) => {
    const rating = callTags[call.id]?.satisfaction_rating;
    if (rating) {
      satisfactionDistribution[rating - 1].count += 1;
    }
  });

  // Call outcome distribution - only include categories with actual calls
  const successfulCount = calls.filter((c) => c.status === "ended" && c.endedReason !== "customer-did-not-answer").length;
  const noAnswerCount = calls.filter((c) => c.endedReason === "customer-did-not-answer").length;
  const failedCount = calls.filter((c) => c.endedReason?.includes("error")).length;

  const outcomeData = [
    { name: "Successful", value: successfulCount, color: "#10B981" },
    { name: "No Answer", value: noAnswerCount, color: "#F59E0B" },
    { name: "Failed", value: failedCount, color: "#EF4444" },
  ].filter((item) => item.value > 0); // Only show categories with actual calls

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Response Rate</p>
                <p className="text-3xl font-bold text-foreground">{responseRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">
                  {answeredCalls} of {totalCalls} calls answered
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-950/30 flex items-center justify-center">
                <Phone className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Avg Satisfaction</p>
                <p className="text-3xl font-bold text-foreground">
                  {avgSatisfaction > 0 ? avgSatisfaction.toFixed(1) : "N/A"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {taggedCalls.length} rated calls
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-950/30 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Avg Duration</p>
                <p className="text-3xl font-bold text-foreground">
                  {calls.length > 0
                    ? Math.round(
                        calls.reduce((sum, c) => sum + (c.duration || 0), 0) / calls.length / 60
                      )
                    : 0}
                  m
                </p>
                <p className="text-xs text-muted-foreground">per call</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Peak Hour</p>
                <p className="text-3xl font-bold text-foreground">
                  {peakTimesData.length > 0
                    ? peakTimesData.reduce((max, d) => (d.calls > max.calls ? d : max)).hour
                    : "N/A"}
                </p>
                <p className="text-xs text-muted-foreground">busiest time</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950/30 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak Call Times */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Peak Call Times (by Hour)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={peakTimesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="calls" fill="#2E6FFF" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Call Outcomes */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Call Outcomes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={outcomeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {outcomeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  formatter={(value, entry: any) => (
                    <span className="text-sm text-foreground">
                      {value}: {entry.payload.value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Satisfaction Distribution */}
      {taggedCalls.length > 0 && (
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Customer Satisfaction Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={satisfactionDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="rating" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {satisfactionDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DetailedAnalytics;
