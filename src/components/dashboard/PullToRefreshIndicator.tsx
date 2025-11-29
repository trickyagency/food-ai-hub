import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  shouldTrigger: boolean;
}

const PullToRefreshIndicator = ({
  pullDistance,
  isRefreshing,
  shouldTrigger,
}: PullToRefreshIndicatorProps) => {
  if (pullDistance === 0 && !isRefreshing) return null;

  return (
    <motion.div
      className="flex items-center justify-center py-4"
      initial={{ opacity: 0, height: 0 }}
      animate={{
        opacity: pullDistance > 0 || isRefreshing ? 1 : 0,
        height: pullDistance > 0 || isRefreshing ? 60 : 0,
      }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="flex flex-col items-center gap-2"
        animate={{
          scale: shouldTrigger ? 1.1 : 1,
        }}
      >
        <motion.div
          animate={{
            rotate: isRefreshing ? 360 : 0,
          }}
          transition={{
            duration: 1,
            repeat: isRefreshing ? Infinity : 0,
            ease: "linear",
          }}
        >
          <RefreshCw
            className={`w-6 h-6 ${
              shouldTrigger ? "text-primary" : "text-muted-foreground"
            }`}
          />
        </motion.div>
        <p className="text-sm text-muted-foreground">
          {isRefreshing
            ? "Refreshing..."
            : shouldTrigger
            ? "Release to refresh"
            : "Pull to refresh"}
        </p>
      </motion.div>
    </motion.div>
  );
};

export default PullToRefreshIndicator;
