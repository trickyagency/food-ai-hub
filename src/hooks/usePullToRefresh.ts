import { useEffect, useRef, useState } from 'react';

interface UsePullToRefreshProps {
  onRefresh: () => void | Promise<void>;
  threshold?: number;
  maxPullDistance?: number;
}

export const usePullToRefresh = ({
  onRefresh,
  threshold = 80,
  maxPullDistance = 150,
}: UsePullToRefreshProps) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canPull, setCanPull] = useState(false);
  const touchStartY = useRef(0);
  const scrollableElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    scrollableElement.current = document.querySelector('.dashboard-content');

    const handleTouchStart = (e: TouchEvent) => {
      const element = scrollableElement.current;
      if (!element) return;

      // Only enable pull if at the top of the scroll
      if (element.scrollTop === 0) {
        setCanPull(true);
        touchStartY.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!canPull || isRefreshing) return;

      const element = scrollableElement.current;
      if (!element) return;

      const touchY = e.touches[0].clientY;
      const distance = touchY - touchStartY.current;

      // Only pull down, not up
      if (distance > 0 && element.scrollTop === 0) {
        e.preventDefault();
        const adjustedDistance = Math.min(
          distance * 0.5, // Damping effect
          maxPullDistance
        );
        setPullDistance(adjustedDistance);
      }
    };

    const handleTouchEnd = async () => {
      if (!canPull) return;

      setCanPull(false);

      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [canPull, pullDistance, threshold, maxPullDistance, isRefreshing, onRefresh]);

  return {
    pullDistance,
    isRefreshing,
    isPulling: pullDistance > 0,
    shouldTrigger: pullDistance >= threshold,
  };
};
