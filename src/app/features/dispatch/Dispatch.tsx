// =============================================================================
// DISPATCH MANAGEMENT MODULE — API-DRIVEN
// =============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Truck,
  Calendar,
  CheckCircle,
  User,
  Box,
  Search,
  ArrowRight,
  ClipboardCheck,
  Loader2,
  MapPin,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { PaginationControls } from '@/app/components/ui/pagination-controls';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';
import { apiClient } from '@/hooks/useApi';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

interface ApiDispatchItem {
  id: number;
  delivery_order_id: number;
  item_id: number;
  warehouse_id: number;
  batch_id: string;
  bin_id: number;
  expiry_date?: string;
  quantity: number;
  item?: {
    id: number;
    item_sku: string;
    item_name: string;
    category_id?: number;
    weight?: string;
  };
}

interface ApiDispatchOrder {
  id: number;
  order_number: string;
  status: string; // packed | dispatched
  due_date: string;
  notes?: string | null;
  is_current_user?: boolean;
  user?: {
    id: number;
    name: string;
    username?: string;
    email?: string;
    address?: string;
  };
  items: ApiDispatchItem[];
  // Populated after dispatch
  dispatch?: {
    id: number;
    driver_name: string;
    vehicle_name: string;
    dispatch_date: string;
    created_by_user?: { id: number; name: string };
  } | null;
}

// Status helpers
const statusLabel = (s: string) =>
  s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const statusColor = (s: string) => {
  switch (s) {
    case 'packed':     return 'bg-orange-100 text-orange-700';
    case 'dispatched': return 'bg-emerald-100 text-emerald-700';
    default:           return 'bg-slate-100 text-slate-600';
  }
};

type Tab = 'QUEUE' | 'HISTORY';

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------

export function Dispatch() {
  const [activeTab, setActiveTab] = useState<Tab>('QUEUE');
  const [orders, setOrders] = useState<ApiDispatchOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ApiDispatchOrder | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [driverName, setDriverName] = useState('');
  const [vehicleName, setVehicleName] = useState('');

  // Server-side pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [paginationMeta, setPaginationMeta] = useState({
    currentPage: 1,
    lastPage: 1,
    perPage: 10,
    total: 0,
    from: null as number | null,
    to: null as number | null,
  });

  // ---------- Fetch orders ----------
  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(
        `/dispatch-requests?search=${encodeURIComponent(debouncedSearch)}&page=${currentPage}&per_page=${perPage}`
      );
      const paginated = res.data?.data ?? res.data;
      const list: ApiDispatchOrder[] = paginated.data ?? [];
      setOrders(list);
      setPaginationMeta({
        currentPage: paginated.current_page,
        lastPage: paginated.last_page,
        perPage: paginated.per_page,
        total: paginated.total,
        from: paginated.from,
        to: paginated.to,
      });
    } catch {
      toast.error('Failed to load dispatch orders');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, perPage, debouncedSearch]);

  // Client-side tab filtering
  const queueOrders = useMemo(() => orders.filter((o) => o.status === 'packed'), [orders]);
  const historyOrders = useMemo(() => orders.filter((o) => o.status === 'dispatched'), [orders]);
  const filteredOrders = activeTab === 'QUEUE' ? queueOrders : historyOrders;

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Reset page on tab switch
  useEffect(() => {
    setCurrentPage(1);
    setSelectedOrder(null);
  }, [activeTab]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ---------- Dispatch action ----------
  const handleDispatchClick = (order: ApiDispatchOrder) => {
    setSelectedOrder(order);
    setDriverName('');
    setVehicleName('');
    setIsModalOpen(true);
  };

  const handleConfirmDispatch = async () => {
    if (!selectedOrder) return;
    if (!driverName.trim() || !vehicleName.trim()) {
      toast.error('Please enter driver and vehicle details');
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.post(`/dispatch-requests/${selectedOrder.id}/dispatch`, {
        driver_name: driverName.trim(),
        vehicle_no: vehicleName.trim(),
      });

      toast.success(`Order ${selectedOrder.order_number} dispatched successfully`);

      // Immediate local update
      setOrders((prev) =>
        prev.map((o) => o.id === selectedOrder.id ? { ...o, status: 'dispatched' } : o)
      );
      setIsModalOpen(false);
      setSelectedOrder(null);

      // Refresh from server
      fetchOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to dispatch order');
    } finally {
      setIsSaving(false);
    }
  };

  // ---------- Helpers ----------
  const customerLabel = (order: ApiDispatchOrder) =>
    order.is_current_user ? 'Current Customer' : (order.user?.name || '-');

  const totalItems = (order: ApiDispatchOrder) =>
    order.items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Dispatch Management</h2>
          <p className="text-slate-500 text-sm">
            Assign drivers, generate gate passes, and ship orders.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm bg-white"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-xl border border-slate-200 w-fit">
        <button
          onClick={() => setActiveTab('QUEUE')}
          className={`px-6 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'QUEUE'
              ? 'bg-orange-100 text-orange-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Box size={18} />
          Ready to Dispatch
          <span
            className={`ml-1 text-xs px-2 py-0.5 rounded-full ${
              activeTab === 'QUEUE'
                ? 'bg-orange-200 text-orange-800'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {queueOrders.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`px-6 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'HISTORY'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Truck size={18} />
          Dispatched History
          <span
            className={`ml-1 text-xs px-2 py-0.5 rounded-full ${
              activeTab === 'HISTORY'
                ? 'bg-slate-600 text-white'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {historyOrders.length}
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {isLoading && orders.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-orange-500" size={32} />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {filteredOrders.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-200"
              >
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Truck className="text-slate-300" size={32} />
                </div>
                <h3 className="text-slate-800 font-semibold">
                  {activeTab === 'QUEUE' ? 'No orders ready' : 'No dispatch history'}
                </h3>
                <p className="text-slate-400 text-sm">
                  {activeTab === 'QUEUE'
                    ? 'Wait for packing team to complete orders.'
                    : 'Dispatched orders will appear here.'}
                </p>
              </motion.div>
            ) : (
              filteredOrders.map((order) => (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:border-orange-300 hover:shadow-md transition-all"
                >
                  <div className="p-5 flex flex-col md:flex-row gap-6 items-center">
                    {/* Icon */}
                    <div
                      className={`p-4 rounded-xl shrink-0 ${
                        order.status === 'packed'
                          ? 'bg-orange-50 text-orange-600'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Truck size={28} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-bold text-slate-800 text-lg">
                            {order.order_number}
                          </h3>
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wide ${statusColor(order.status)}`}
                          >
                            {statusLabel(order.status)}
                          </span>
                        </div>
                        <p className="text-slate-600 font-medium">{customerLabel(order)}</p>
                        {order.user?.address && (
                          <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
                            <MapPin size={14} />
                            <span>{order.user.address}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col justify-center gap-2 text-sm text-slate-500 border-l border-slate-100 pl-4">
                        <div className="flex items-center gap-2">
                          <Box size={14} />
                          <span>{totalItems(order)} Items ({order.items?.length ?? 0} lines)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar size={14} />
                          <span>Due: {order.due_date?.split('T')[0]}</span>
                        </div>
                        {order.dispatch?.dispatch_date && (
                          <div className="flex items-center gap-2 text-emerald-600 font-medium">
                            <CheckCircle size={14} />
                            <span>Dispatched: {order.dispatch.dispatch_date.split('T')[0]}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action / Info Column */}
                    <div className="w-full md:w-auto flex flex-col gap-2">
                      {order.status === 'packed' ? (
                        <Button
                          onClick={() => handleDispatchClick(order)}
                          className="bg-orange-600 hover:bg-orange-700 w-full md:w-auto"
                        >
                          Dispatch Order <ArrowRight size={16} className="ml-2" />
                        </Button>
                      ) : (
                        <div className="flex flex-col gap-2 min-w-[160px]">
                          <div className="bg-slate-50 p-2 rounded text-xs border border-slate-100">
                            <p className="font-bold text-slate-700">
                              Driver: {order.dispatch?.driver_name || '-'}
                            </p>
                            <p className="text-slate-500">
                              Veh: {order.dispatch?.vehicle_name || '-'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        )}

        {/* Pagination */}
        {filteredOrders.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100">
            <PaginationControls
              currentPage={paginationMeta.currentPage}
              lastPage={paginationMeta.lastPage}
              perPage={paginationMeta.perPage}
              total={paginationMeta.total}
              from={paginationMeta.from}
              to={paginationMeta.to}
              onPageChange={setCurrentPage}
              onPerPageChange={setPerPage}
            />
          </div>
        )}
      </div>

      {/* Dispatch Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Dispatch Order {selectedOrder?.order_number}</DialogTitle>
            <DialogDescription>
              Assign logistics details to dispatch this order.
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <>
              <div className="grid gap-4 py-4">
                {/* Customer & Due Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Customer</label>
                    <div className="p-2 bg-slate-100 rounded border border-slate-200 text-slate-600 text-sm">
                      {customerLabel(selectedOrder)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Due Date</label>
                    <div className="p-2 bg-slate-100 rounded border border-slate-200 text-slate-500 text-sm">
                      {selectedOrder.due_date?.split('T')[0]}
                    </div>
                  </div>
                </div>

                {/* Destination */}
                {selectedOrder.user?.address && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Customer Address</label>
                    <div className="flex items-start gap-2 p-3 bg-blue-50 text-blue-800 rounded border border-blue-100 text-sm">
                      <MapPin size={16} className="shrink-0 mt-0.5" />
                      {selectedOrder.user.address}
                    </div>
                  </div>
                )}

                {/* Items */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Items ({selectedOrder.items?.length ?? 0} lines, {totalItems(selectedOrder)} qty)
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                    {selectedOrder.items?.map((item) => (
                      <div key={item.id} className="flex items-center justify-between px-3 py-2 text-sm">
                        <div>
                          <span className="font-medium text-slate-700">{item.item?.item_name || '-'}</span>
                          <span className="ml-2 text-slate-400 text-xs">{item.item?.item_sku}</span>
                        </div>
                        <span className="font-bold text-slate-600">×{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Driver Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Driver Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Enter driver's name"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    />
                  </div>
                </div>

                {/* Vehicle Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Vehicle Number</label>
                  <div className="relative">
                    <Truck className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. WKL 1234"
                      value={vehicleName}
                      onChange={(e) => setVehicleName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmDispatch}
                  className="bg-orange-600 hover:bg-orange-700"
                  disabled={isSaving}
                >
                  {isSaving && <Loader2 size={16} className="animate-spin mr-2" />}
                  <ClipboardCheck size={16} className="mr-2" />
                  Confirm Dispatch
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Dispatch;
