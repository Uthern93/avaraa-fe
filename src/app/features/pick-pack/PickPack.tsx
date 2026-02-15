// =============================================================================
// PICK & PACK FEATURE MODULE  API-DRIVEN
// =============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ClipboardList,
  Package,
  Box,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  Download,
  MapPin,
  Search,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { PaginationControls } from '@/app/components/ui/pagination-controls';
import { apiClient } from '@/hooks/useApi';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

interface ApiDispatchItem {
  id: number;
  dispatch_id: number;
  item_id: number;
  quantity: number;
  picked_quantity?: number;
  packed_quantity?: number;
  item?: {
    id: number;
    item_sku: string;
    item_name: string;
  };
  stock?: {
    warehouse_name: string;
    rack_code: string;
    bin_code: string;
  } | null;
}

interface ApiDispatchOrder {
  id: number;
  order_number: string;
  status: string; // pending | picking | picked | packing | packed | dispatched
  due_date: string;
  priority?: string; // normal | high
  notes?: string | null;
  user_id?: number;
  created_by?: number;
  created_at?: string;
  updated_at?: string;
  is_current_user?: boolean;
  user?: { id: number; name: string; username?: string; email?: string };
  items: ApiDispatchItem[];
}

type Tab = 'PICKING' | 'PACKING';

// Status helpers
const statusLabel = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const statusColor = (s: string) => {
  switch (s) {
    case 'pending': return 'bg-amber-100 text-amber-700';
    case 'picking': return 'bg-blue-100 text-blue-700';
    case 'picked': return 'bg-emerald-100 text-emerald-700';
    case 'packing': return 'bg-purple-100 text-purple-700';
    case 'packed': return 'bg-teal-100 text-teal-700';
    case 'dispatched': return 'bg-slate-100 text-slate-600';
    default: return 'bg-slate-100 text-slate-600';
  }
};

const PICKING_STATUSES = ['pending', 'picking'];
const PACKING_STATUSES = ['picked', 'packing', 'packed'];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------

export function PickPack() {
  const [activeTab, setActiveTab] = useState<Tab>('PICKING');
  const [orders, setOrders] = useState<ApiDispatchOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ApiDispatchOrder | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  // ---- Fetch all orders (no status filter) ----
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

  // Client-side filtering per tab
  const pickingOrders = useMemo(() => orders.filter(o => PICKING_STATUSES.includes(o.status)), [orders]);
  const packingOrders = useMemo(() => orders.filter(o => PACKING_STATUSES.includes(o.status)), [orders]);
  const filteredOrders = activeTab === 'PICKING' ? pickingOrders : packingOrders;

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Reset page when switching tabs
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

  // ---- Status change (dedicated endpoints, no payload) ----
  const statusEndpoint = (orderId: number, newStatus: string) => {
    switch (newStatus) {
      case 'picking':  return `/dispatch-requests/${orderId}/start-picking`;
      case 'picked':   return `/dispatch-requests/${orderId}/complete-picking`;
      case 'packing':  return `/dispatch-requests/${orderId}/start-packing`;
      case 'packed':   return `/dispatch-requests/${orderId}/complete-packing`;
      default:         return `/dispatch-requests/${orderId}/update-status`;
    }
  };

  const handleStatusChange = async (order: ApiDispatchOrder, newStatus: string) => {
    setIsSaving(true);
    try {
      await apiClient.put(statusEndpoint(order.id, newStatus));
      toast.success(`Order ${order.order_number} moved to ${statusLabel(newStatus)}`);

      // Immediate local update — mutate the order in the list so tabs recompute
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: newStatus } : o));
      if (selectedOrder && selectedOrder.id === order.id) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }

      fetchOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setIsSaving(false);
    }
  };

  // ---- Download Delivery Order ----
  const downloadDeliveryOrder = (order: ApiDispatchOrder) => {
    const date = new Date().toLocaleDateString();
    let content = `DELIVERY ORDER\n\n`;
    content += `Order: ${order.order_number}\n`;
    content += `Customer: ${order.is_current_user ? 'Current Customer' : (order.user?.name || '-')}\n`;
    content += `Date: ${date}\n`;
    content += `Due Date: ${order.due_date}\n`;
    content += `Priority: ${order.priority}\n\n`;
    content += `----------------------------------------\n`;
    content += `ITEMS:\n`;

    order.items.forEach((item, index) => {
      const loc = item.stock ? `[Loc: ${item.stock.rack_code}-${item.stock.bin_code}]` : '';
      content += `${index + 1}. [${item.item?.item_sku || '-'}] ${item.item?.item_name || '-'} - QTY: ${item.quantity} ${loc}\n`;
    });

    content += `----------------------------------------\n`;
    content += `\nVerified By: __________________________\n`;
    content += `Date: _________________________________\n`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DO-${order.order_number}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Delivery Order Downloaded');
  };

  // ---- Loading skeleton ----
  const OrderListSkeleton = () => (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100" />
            <div className="flex-1 space-y-2">
              <div className="flex justify-between">
                <div className="h-4 w-28 bg-slate-200 rounded" />
                <div className="h-4 w-16 bg-slate-100 rounded" />
              </div>
              <div className="h-3 w-40 bg-slate-100 rounded" />
              <div className="flex gap-4">
                <div className="h-3 w-20 bg-slate-100 rounded" />
                <div className="h-3 w-24 bg-slate-100 rounded" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Pick & Pack Operations</h2>
          <p className="text-slate-500 text-sm">Orchestrate order fulfillment from shelf to box.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-xl border border-slate-200 w-fit">
        <button
          onClick={() => setActiveTab('PICKING')}
          className={`px-6 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'PICKING'
              ? 'bg-blue-100 text-blue-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <ClipboardList size={18} />
          Picking
          <span className={`ml-1 text-xs px-2 py-0.5 rounded-full ${activeTab === 'PICKING' ? 'bg-blue-200 text-blue-800' : 'bg-slate-200 text-slate-600'}`}>
            {pickingOrders.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('PACKING')}
          className={`px-6 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'PACKING'
              ? 'bg-purple-100 text-purple-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Package size={18} />
          Packing
          <span className={`ml-1 text-xs px-2 py-0.5 rounded-full ${activeTab === 'PACKING' ? 'bg-purple-200 text-purple-800' : 'bg-slate-200 text-slate-600'}`}>
            {packingOrders.length}
          </span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by order number, customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Order List */}
      <div className="space-y-4">
        {isLoading ? (
          <OrderListSkeleton />
        ) : filteredOrders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-200"
          >
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-slate-300" size={32} />
            </div>
            <h3 className="text-slate-800 font-semibold">All caught up!</h3>
            <p className="text-slate-400 text-sm">No active orders in this queue.</p>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            {filteredOrders.map((order) => (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => { setSelectedOrder(order); setIsModalOpen(true); }}
                className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group"
              >
                <div className="p-4 flex flex-col sm:flex-row gap-4 items-center">
                  <div className={`p-3 rounded-xl shrink-0 ${
                    activeTab === 'PICKING' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                  }`}>
                    {activeTab === 'PICKING' ? <ClipboardList size={24} /> : <Package size={24} />}
                  </div>

                  <div className="flex-1 w-full">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                          {order.order_number}
                        </h3>
                        {order.priority === 'high' && (
                          <span className="flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                            <AlertTriangle size={10} /> URGENT
                          </span>
                        )}
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusColor(order.status)}`}>
                        {statusLabel(order.status)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{order.is_current_user ? 'Current Customer' : (order.user?.name || '-')}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Box size={12} />
                        {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                        {' '}({order.items.reduce((s, i) => s + i.quantity, 0)} units)
                      </span>
                      <span className="flex items-center gap-1"><Clock size={12} /> Due: {order.due_date}</span>
                    </div>
                  </div>

                  <div className="hidden sm:block text-slate-300">
                    <ChevronRight size={24} />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* Pagination */}
        {paginationMeta.total > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100">
            <PaginationControls
              currentPage={paginationMeta.currentPage}
              lastPage={paginationMeta.lastPage}
              perPage={paginationMeta.perPage}
              total={paginationMeta.total}
              from={paginationMeta.from}
              to={paginationMeta.to}
              onPageChange={setCurrentPage}
              onPerPageChange={(pp) => { setPerPage(pp); setCurrentPage(1); }}
              isLoading={isLoading}
            />
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span>Order {selectedOrder.order_number}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${statusColor(selectedOrder.status)}`}>
                    {statusLabel(selectedOrder.status)}
                  </span>
                  {selectedOrder.priority === 'high' && (
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                      <AlertTriangle size={10} /> URGENT
                    </span>
                  )}
                </DialogTitle>
                <DialogDescription>
                  {selectedOrder.is_current_user ? 'Current Customer' : (selectedOrder.user?.name || '-')} &bull; Due {selectedOrder.due_date}
                </DialogDescription>
              </DialogHeader>

              <div className="py-4 space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                    Items to {activeTab === 'PICKING' ? 'Pick' : 'Pack'}
                  </h4>

                  <div className="space-y-2">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded border border-slate-200 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-slate-100 rounded text-slate-400">
                            <Box size={16} />
                          </div>
                          <div>
                            <p className="font-medium text-slate-800 text-sm">{item.item?.item_name || '-'}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-slate-500 font-mono">{item.item?.item_sku || '-'}</p>
                              {item.stock && (
                                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                                  <MapPin size={10} />
                                  <span>{item.stock.rack_code}-{item.stock.bin_code}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-700 text-sm block">{item.quantity}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto flex items-center gap-2"
                  onClick={() => downloadDeliveryOrder(selectedOrder)}
                >
                  <Download size={16} />
                  Download DO
                </Button>

                <div className="flex-1"></div>

                {activeTab === 'PICKING' && selectedOrder.status !== 'picked' && (
                  <Button
                    className={`w-full sm:w-auto ${
                      selectedOrder.status === 'pending' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                    onClick={() => {
                      const newStatus = selectedOrder.status === 'pending' ? 'picking' : 'picked';
                      handleStatusChange(selectedOrder, newStatus);
                    }}
                    disabled={isSaving}
                  >
                    {isSaving && <Loader2 size={16} className="animate-spin mr-2" />}
                    {selectedOrder.status === 'pending' ? 'Start Picking' : 'Complete Picking'}
                  </Button>
                )}

                {activeTab === 'PACKING' && selectedOrder.status !== 'packed' && (
                  <Button
                    className={`w-full sm:w-auto ${
                      selectedOrder.status === 'picked' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                    onClick={() => {
                      const newStatus = selectedOrder.status === 'picked' ? 'packing' : 'packed';
                      handleStatusChange(selectedOrder, newStatus);
                    }}
                    disabled={isSaving}
                  >
                    {isSaving && <Loader2 size={16} className="animate-spin mr-2" />}
                    {selectedOrder.status === 'picked' ? 'Start Packing' : 'Complete Packing'}
                  </Button>
                )}

                {activeTab === 'PACKING' && selectedOrder.status === 'packed' && (
                  <span className="text-xs font-bold text-teal-600 bg-teal-50 px-3 py-2 rounded-lg">
                    ✓ Packing Complete
                  </span>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PickPack;
