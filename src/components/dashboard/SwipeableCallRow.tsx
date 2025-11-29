import { useState, useRef } from "react";
import { motion, PanInfo, useAnimation } from "framer-motion";
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VapiCall } from "@/hooks/useVapiCalls";
import { Eye, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface SwipeableCallRowProps {
  call: VapiCall;
  onViewDetails: (call: VapiCall) => void;
  getStatusBadge: (status: string, endedReason?: string) => JSX.Element;
  getCallTypeLabel: (type: string) => string;
}

const SwipeableCallRow = ({
  call,
  onViewDetails,
  getStatusBadge,
  getCallTypeLabel,
}: SwipeableCallRowProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const controls = useAnimation();
  const constraintsRef = useRef(null);

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 80;
    
    if (info.offset.x < -threshold) {
      // Swiped left - open actions
      setIsOpen(true);
      controls.start({ x: -120 });
    } else if (info.offset.x > threshold && isOpen) {
      // Swiped right - close actions
      setIsOpen(false);
      controls.start({ x: 0 });
    } else {
      // Return to previous state
      controls.start({ x: isOpen ? -120 : 0 });
    }
  };

  const handleViewClick = () => {
    onViewDetails(call);
    setIsOpen(false);
    controls.start({ x: 0 });
  };

  return (
    <div className="relative overflow-hidden" ref={constraintsRef}>
      {/* Action buttons revealed on swipe */}
      <div className="absolute right-0 top-0 bottom-0 flex items-center gap-2 pr-4 bg-primary/10">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleViewClick}
          className="h-full px-4 hover:bg-primary/20"
        >
          <Eye className="w-5 h-5 text-primary" />
        </Button>
      </div>

      {/* Main row content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -120, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={controls}
        className="bg-card cursor-grab active:cursor-grabbing touch-pan-y"
      >
        <TableRow className="hover:bg-muted/50 border-b">
          <TableCell className="py-4">
            <Badge variant="outline" className="text-xs sm:text-sm">
              {getCallTypeLabel(call.type)}
            </Badge>
          </TableCell>
          <TableCell className="font-mono text-xs sm:text-sm py-4">
            {call.customer?.number || call.phoneNumber?.number || "N/A"}
          </TableCell>
          <TableCell className="text-xs sm:text-sm py-4">
            {call.duration
              ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s`
              : "N/A"}
          </TableCell>
          <TableCell className="font-semibold text-xs sm:text-sm py-4">
            ${(call.cost || 0).toFixed(4)}
          </TableCell>
          <TableCell className="py-4">
            {getStatusBadge(call.status, call.endedReason)}
          </TableCell>
          <TableCell className="text-xs sm:text-sm text-muted-foreground py-4">
            {format(new Date(call.createdAt), "MMM d, h:mm a")}
          </TableCell>
          <TableCell className="text-right py-4 hidden sm:table-cell">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onViewDetails(call)}
            >
              <Eye className="w-4 h-4 mr-1" />
              View
            </Button>
          </TableCell>
        </TableRow>
      </motion.div>
    </div>
  );
};

export default SwipeableCallRow;
