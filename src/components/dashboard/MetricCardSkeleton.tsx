import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const MetricCardSkeleton = () => {
  return (
    <Card className="bg-card border border-border/60">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <Skeleton className="w-11 h-11 rounded-lg" />
          <Skeleton className="w-4 h-4 rounded-full" />
        </div>
        
        <div className="relative mb-4">
          <Skeleton className="w-full h-[140px] rounded-full" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-32" />
        </div>
      </CardContent>
    </Card>
  );
};

export const MetricCardsSkeletonGrid = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
      {[...Array(5)].map((_, i) => (
        <MetricCardSkeleton key={i} />
      ))}
    </div>
  );
};
