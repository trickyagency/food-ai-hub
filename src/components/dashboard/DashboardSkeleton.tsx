import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCardsSkeletonGrid } from "./MetricCardSkeleton";
import { ChartSkeleton } from "./ChartSkeleton";

const TableSkeleton = ({ rows = 5 }: { rows?: number }) => {
  return (
    <Card className="bg-card border border-border/60">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Table header */}
          <div className="grid grid-cols-5 gap-4 pb-3 border-b border-border/40">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
          {/* Table rows */}
          {[...Array(rows)].map((_, i) => (
            <div key={i} className="grid grid-cols-5 gap-4 py-3">
              {[...Array(5)].map((_, j) => (
                <Skeleton key={j} className="h-4 w-full" />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const FiltersBarSkeleton = () => {
  return (
    <div className="flex flex-wrap gap-3">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-10 w-32 rounded-md" />
      ))}
    </div>
  );
};

const OrdersWidgetSkeleton = () => {
  return (
    <Card className="bg-card border border-border/60">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="h-6 w-36" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-12" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export const DashboardSkeleton = () => {
  return (
    <div className="space-y-6 sm:space-y-8 animate-pulse">
      {/* Filters skeleton */}
      <FiltersBarSkeleton />
      
      {/* Tabs skeleton */}
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-28 rounded-md" />
        ))}
      </div>

      {/* Metrics Grid Skeleton */}
      <MetricCardsSkeletonGrid />

      {/* Orders Widget Skeleton */}
      <OrdersWidgetSkeleton />

      {/* Cost Breakdown Skeleton */}
      <Card className="bg-card border border-border/60">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2.5">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="h-6 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts Skeleton */}
      <ChartSkeleton />
      
      {/* Performance Trends Skeleton */}
      <ChartSkeleton />
    </div>
  );
};

export default DashboardSkeleton;
