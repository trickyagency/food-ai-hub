import { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, 
  Filter, 
  Eye, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  AlertCircle,
  CheckSquare,
  X,
  MapPin,
  Package
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { DateRange } from "react-day-picker";
import DateRangePicker from "@/components/dashboard/DateRangePicker";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { OrderDetailDialogEnhanced } from "./OrderDetailDialogEnhanced";
import { Order } from "@/hooks/useOrders";
import { useToast } from "@/hooks/use-toast";

interface OrdersTableEnhancedProps {
  orders: Order[];
  loading: boolean;
  onStatusUpdate: (orderId: string, status: string) => Promise<boolean>;
  onRefresh: () => void;
  lastUpdated: Date | null;
}

const ITEMS_PER_PAGE = 10;

const STATUS_OPTIONS = [
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export const OrdersTableEnhanced = ({ 
  orders, 
  loading, 
  onStatusUpdate,
  onRefresh,
  lastUpdated 
}: OrdersTableEnhancedProps) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Bulk selection state
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkTargetStatus, setBulkTargetStatus] = useState<string>("preparing");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Clear selection when filters change
  useEffect(() => {
    setSelectedOrders(new Set());
  }, [debouncedSearch, statusFilter, dateRange]);

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Search filter
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        const matchesSearch = 
          (order.customer_name?.toLowerCase().includes(searchLower)) ||
          order.customer_number.includes(debouncedSearch) ||
          order.id.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== "all" && order.status !== statusFilter) {
        return false;
      }

      // Date range filter
      if (dateRange?.from && order.created_at) {
        const orderDate = new Date(order.created_at);
        if (orderDate < dateRange.from) return false;
        if (dateRange.to) {
          const endOfDay = new Date(dateRange.to);
          endOfDay.setHours(23, 59, 59, 999);
          if (orderDate > endOfDay) return false;
        }
      }

      return true;
    });
  }, [orders, debouncedSearch, statusFilter, dateRange]);

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  // Generate page numbers with ellipsis
  const getPageNumbers = useCallback(() => {
    const pages: (number | string)[] = [];
    const showPages = 5;
    
    if (totalPages <= showPages + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      
      if (currentPage > 3) pages.push("...");
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) pages.push(i);
      
      if (currentPage < totalPages - 2) pages.push("...");
      
      pages.push(totalPages);
    }
    
    return pages;
  }, [totalPages, currentPage]);

  // Selection handlers
  const isAllSelected = paginatedOrders.length > 0 && paginatedOrders.every(o => selectedOrders.has(o.id));
  const isSomeSelected = paginatedOrders.some(o => selectedOrders.has(o.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      // Deselect all on current page
      const newSelected = new Set(selectedOrders);
      paginatedOrders.forEach(o => newSelected.delete(o.id));
      setSelectedOrders(newSelected);
    } else {
      // Select all on current page
      const newSelected = new Set(selectedOrders);
      paginatedOrders.forEach(o => newSelected.add(o.id));
      setSelectedOrders(newSelected);
    }
  };

  const toggleSelectOrder = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const clearSelection = () => {
    setSelectedOrders(new Set());
  };

  // Bulk update handler
  const handleBulkUpdate = async () => {
    setShowBulkConfirm(false);
    setIsBulkUpdating(true);

    const orderIds = Array.from(selectedOrders);
    let successCount = 0;
    let failCount = 0;

    for (const orderId of orderIds) {
      try {
        const success = await onStatusUpdate(orderId, bulkTargetStatus);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
      }
    }

    setIsBulkUpdating(false);
    setSelectedOrders(new Set());

    if (failCount === 0) {
      toast({
        title: "Bulk Update Complete",
        description: `Successfully updated ${successCount} order${successCount !== 1 ? 's' : ''} to "${bulkTargetStatus}"`,
      });
    } else {
      toast({
        title: "Bulk Update Partially Complete",
        description: `Updated ${successCount} order${successCount !== 1 ? 's' : ''}, ${failCount} failed`,
        variant: "destructive",
      });
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setDateRange(undefined);
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all" || dateRange;

  const getItemsPreview = (items: any) => {
    if (!items) return "No items";
    const itemArray = Array.isArray(items) ? items : [];
    if (itemArray.length === 0) return "No items";
    const firstItem = itemArray[0];
    const remaining = itemArray.length - 1;
    return `${firstItem.name || "Item"}${remaining > 0 ? ` +${remaining} more` : ""}`;
  };

  const isOrderUrgent = (order: Order) => {
    if (!order.created_at || order.status === 'completed' || order.status === 'cancelled') return false;
    const orderAge = Date.now() - new Date(order.created_at).getTime();
    const urgentThreshold = 30 * 60 * 1000; // 30 minutes
    return orderAge > urgentThreshold;
  };

  if (loading) {
    return (
      <Card className="bg-card border border-border/60">
        <CardHeader className="pb-4">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-10 w-32" />
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-card border border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg font-semibold text-foreground">
                Orders ({filteredOrders.length})
              </CardTitle>
              {lastUpdated && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer, phone, or order ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="preparing">Preparing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={(range) => { setDateRange(range); setCurrentPage(1); }}
            />
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear
              </Button>
            )}
          </div>

          {/* Bulk Action Bar */}
          {selectedOrders.size > 0 && (
            <div className="flex items-center gap-3 p-3 mb-4 bg-primary/5 border border-primary/20 rounded-lg">
              <CheckSquare className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">
                {selectedOrders.size} order{selectedOrders.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex-1" />
              <Select value={bulkTargetStatus} onValueChange={setBulkTargetStatus}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Set status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                size="sm" 
                onClick={() => setShowBulkConfirm(true)}
                disabled={isBulkUpdating}
              >
                {isBulkUpdating ? "Updating..." : "Update Status"}
              </Button>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Table */}
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {hasActiveFilters ? "No orders match your filters" : "No orders yet"}
              </p>
              {hasActiveFilters && (
                <Button variant="link" onClick={clearFilters} className="mt-2">
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-12">
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all orders on this page"
                          className={isSomeSelected && !isAllSelected ? "opacity-50" : ""}
                        />
                      </TableHead>
                      <TableHead className="font-semibold">Customer</TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold">Items</TableHead>
                      <TableHead className="font-semibold text-right">Total</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedOrders.map((order) => (
                      <TableRow 
                        key={order.id} 
                        className={`hover:bg-muted/30 transition-colors ${
                          selectedOrders.has(order.id) ? 'bg-primary/5' : ''
                        } ${isOrderUrgent(order) ? 'bg-warning/5' : ''}`}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedOrders.has(order.id)}
                            onCheckedChange={() => toggleSelectOrder(order.id)}
                            aria-label={`Select order ${order.id}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-start gap-2">
                            {isOrderUrgent(order) && (
                              <AlertCircle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                            )}
                            <div>
                              <p className="font-medium text-foreground">
                                {order.customer_name || "Unknown"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {order.customer_number}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {order.order_type === 'delivery' ? (
                              <Badge variant="outline" className="gap-1 text-xs">
                                <MapPin className="w-3 h-3" />
                                Delivery
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1 text-xs">
                                <Package className="w-3 h-3" />
                                Pickup
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-foreground truncate max-w-[200px]">
                            {getItemsPreview(order.items)}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-foreground">
                            ${order.total.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <OrderStatusBadge status={order.status || "confirmed"} />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm text-foreground">
                              {order.created_at 
                                ? format(new Date(order.created_at), "MMM dd, yyyy")
                                : "N/A"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {order.created_at 
                                ? format(new Date(order.created_at), "HH:mm")
                                : ""}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(order)}
                            className="gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to{" "}
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length)} of{" "}
                    {filteredOrders.length} orders
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(p => p - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    
                    {getPageNumbers().map((page, idx) => (
                      typeof page === 'number' ? (
                        <Button
                          key={idx}
                          variant={currentPage === page ? "default" : "outline"}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      ) : (
                        <span key={idx} className="px-2 text-muted-foreground">...</span>
                      )
                    ))}
                    
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(p => p + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <OrderDetailDialogEnhanced
        order={selectedOrder}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onStatusUpdate={onStatusUpdate}
      />

      {/* Bulk Update Confirmation Dialog */}
      <AlertDialog open={showBulkConfirm} onOpenChange={setShowBulkConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Update {selectedOrders.size} Order{selectedOrders.size !== 1 ? 's' : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkTargetStatus === 'cancelled' ? (
                <span className="text-destructive">
                  Warning: You are about to cancel {selectedOrders.size} order{selectedOrders.size !== 1 ? 's' : ''}. 
                  This action cannot be easily undone.
                </span>
              ) : (
                <>
                  This will update all selected orders to <strong className="text-foreground">{bulkTargetStatus}</strong> status.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkUpdate}
              className={bulkTargetStatus === 'cancelled' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              Update {selectedOrders.size} Order{selectedOrders.size !== 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};