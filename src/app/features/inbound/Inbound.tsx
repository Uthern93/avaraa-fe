// =============================================================================
// INBOUND FEATURE MODULE  API-DRIVEN
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck,
  CheckCircle,
  Search,
  FileText,
  Package,
  ArrowRight,
  ArrowDownToLine,
  Box,
  MapPin,
  Grid3X3,
  Layers,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { apiClient } from '@/hooks/useApi';
import { PaginationControls } from '@/app/components/ui/pagination-controls';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

interface ApiRack {
  id: number;
  code: string;
  label: string;
  warehouse_id?: number;
}

interface ApiBin {
  id: number;
  rack_id: number;
  code: string;
  label: string;
  is_occupied?: boolean;
  current_item?: { id: number; item_sku: string; item_name: string } | null;
}

interface ApiInboundItem {
  id: number;
  inbound_id: number;
  item_id: number;
  quantity: number;
  received_quantity?: number;
  rack_id: number | null;
  bin_id: number | null;
  bin_location?: string | null;
  expiry_date: string | null;
  maintenance_date: string | null;
  manufacturing_year: number | null;
  status: string; // pending | stored
  item?: {
    id: number;
    item_sku: string;
    item_name: string;
    category_id: number | null;
    weight: string | null;
  };
  rack?: ApiRack | null;
}

interface ApiWarehouse {
  id: number;
  name: string;
}

interface ApiInboundOrder {
  id: number;
  inbound_number: string;
  batch_id?: string;
  warehouse_id: number;
  expected_arrival_date: string;
  status: string; // pending | verifying | completed
  notes?: string | null;
  created_by?: number;
  created_at?: string;
  warehouse?: ApiWarehouse;
  creator?: { id: number; name: string };
  items: ApiInboundItem[];
}

// Status helpers
const statusLabel = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const statusColor = (s: string) => {
  switch (s) {
    case 'completed': return 'bg-emerald-100 text-emerald-700';
    case 'verifying': return 'bg-blue-100 text-blue-700';
    case 'arrived': return 'bg-amber-100 text-amber-700';
    default: return 'bg-slate-100 text-slate-600';
  }
};
const itemStatusStored = (s: string) => s === 'stored';

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------

export function Inbound() {
  // List state
  const [orders, setOrders] = useState<ApiInboundOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ApiInboundOrder | null>(null);
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

  // Putaway state
  const [activeItem, setActiveItem] = useState<ApiInboundItem | null>(null);
  const [racks, setRacks] = useState<ApiRack[]>([]);
  const [bins, setBins] = useState<ApiBin[]>([]);
  const [selectedRackId, setSelectedRackId] = useState<number | null>(null);
  const [selectedBinId, setSelectedBinId] = useState<number | null>(null);
  const [isLoadingRacks, setIsLoadingRacks] = useState(false);
  const [isLoadingBins, setIsLoadingBins] = useState(false);

  // ---- Fetch orders ----
  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(
        `/inbound-applications?search=${encodeURIComponent(debouncedSearch)}&page=${currentPage}&per_page=${perPage}`
      );
      const paginated = res.data?.data ?? res.data;
      const list: ApiInboundOrder[] = paginated.data ?? [];
      setOrders(list);
      setPaginationMeta({
        currentPage: paginated.current_page,
        lastPage: paginated.last_page,
        perPage: paginated.per_page,
        total: paginated.total,
        from: paginated.from,
        to: paginated.to,
      });

      // Keep selected order in sync if it's still in the list
      if (selectedOrder) {
        const fresh = list.find(o => o.id === selectedOrder.id);
        if (fresh) setSelectedOrder(fresh);
      }
    } catch {
      toast.error('Failed to load inbound orders');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, perPage, debouncedSearch]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ---- Start verification ----
  const handleVerifyStart = async (orderId: number) => {
    setIsSaving(true);
    try {
      await apiClient.put(`/inbound-applications/${orderId}/verify`);
      toast.success('Verification started. Proceed to putaway items.');
      // Immediately update the selected order status for instant UI feedback
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: 'verifying' });
      }
      fetchOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to start verification');
    } finally {
      setIsSaving(false);
    }
  };

  // ---- Putaway ----
  const openPutawayModal = (item: ApiInboundItem) => {
    if (!selectedOrder) return;
    setActiveItem(item);
    setSelectedRackId(item.rack_id);
    setSelectedBinId(null);
    setBins([]);

    // Fetch racks for the order's warehouse
    setIsLoadingRacks(true);
    apiClient.get(`/racks?warehouse_id=${selectedOrder.warehouse_id}`)
      .then(res => setRacks(res.data?.data ?? res.data ?? []))
      .catch(() => toast.error('Failed to load racks'))
      .finally(() => setIsLoadingRacks(false));

    // If the item already has a rack, fetch bins for it
    if (item.rack_id) {
      fetchBinsForRack(item.rack_id, selectedOrder.warehouse_id);
    }
  };

  const fetchBinsForRack = (rackId: number, warehouseId: number) => {
    setIsLoadingBins(true);
    apiClient.get(`/racks/${rackId}/bins?warehouse_id=${warehouseId}`)
      .then(res => setBins(res.data?.data ?? res.data ?? []))
      .catch(() => toast.error('Failed to load bins'))
      .finally(() => setIsLoadingBins(false));
  };

  const selectRack = (rackId: number) => {
    setSelectedRackId(rackId);
    setSelectedBinId(null);
    if (selectedOrder) {
      fetchBinsForRack(rackId, selectedOrder.warehouse_id);
    }
  };

  const confirmPutaway = async () => {
    if (!activeItem || !selectedOrder || !selectedRackId || !selectedBinId) {
      toast.error('Please select a Rack and Bin');
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.put(
        `/inbound-applications/${selectedOrder.id}/items/${activeItem.id}/putaway`,
        {
          rack_id: selectedRackId,
          bin_id: selectedBinId,
          received_quantity: activeItem.quantity,
        }
      );
      toast.success(`Item stored successfully`);
      // Immediately update local state for instant UI feedback
      if (selectedOrder) {
        const updatedItems = selectedOrder.items.map(i =>
          i.id === activeItem.id ? { ...i, status: 'stored', rack_id: selectedRackId, bin_id: selectedBinId } : i
        );
        const allStored = updatedItems.every(i => itemStatusStored(i.status));
        setSelectedOrder({
          ...selectedOrder,
          items: updatedItems,
          status: allStored ? 'completed' : selectedOrder.status,
        });
      }
      setActiveItem(null);
      fetchOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to putaway item');
    } finally {
      setIsSaving(false);
    }
  };

  // ---- Derived values ----
  const selectedRack = racks.find(r => r.id === selectedRackId);
  const selectedBin = bins.find(b => b.id === selectedBinId);

  // ---- Loading skeleton for order list ----
  const OrderListSkeleton = () => (
    <div className="space-y-2 p-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-3 rounded-lg border border-slate-100 animate-pulse">
          <div className="flex justify-between items-start mb-2">
            <div className="h-4 w-28 bg-slate-200 rounded" />
            <div className="h-4 w-16 bg-slate-200 rounded-full" />
          </div>
          <div className="h-3 w-40 bg-slate-100 rounded mb-2" />
          <div className="flex justify-between">
            <div className="h-3 w-20 bg-slate-100 rounded" />
            <div className="h-3 w-20 bg-slate-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6 relative">
      {/* List Panel */}
      <div className={`w-full lg:w-1/3 flex flex-col bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden ${selectedOrder ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <ArrowDownToLine className="text-blue-500" size={20} />
            Inbound & Putaway
          </h2>
          <p className="text-xs text-slate-500 mt-1">Manage arrivals and bin assignments</p>
        </div>
        <div className="p-3 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search GRN, Warehouse..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {isLoading ? (
          <OrderListSkeleton />
        ) : (
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {orders.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">
                <Package size={28} className="mx-auto mb-2 opacity-40" />
                <p>No inbound orders found</p>
              </div>
            )}
            {orders.map((order) => (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={`p-3 rounded-lg cursor-pointer border transition-all ${
                  selectedOrder?.id === order.id
                    ? 'bg-blue-50 border-blue-200 shadow-sm'
                    : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-slate-800 text-sm">{order.inbound_number}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor(order.status)}`}>
                    {statusLabel(order.status)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-2 truncate">{order.warehouse?.name || '-'}</p>
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Package size={12} /> {order.items.length} items</span>
                  <span>{order.expected_arrival_date}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {paginationMeta.total > 0 && (
          <div className="border-t border-slate-100 px-2">
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

      {/* Detail Panel */}
      <div className={`flex-1 bg-white rounded-xl shadow-sm border border-slate-100 flex-col relative overflow-hidden ${selectedOrder ? 'flex' : 'hidden lg:flex'}`}>
        <AnimatePresence mode="wait">
          {selectedOrder ? (
            <motion.div
              key={selectedOrder.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col h-full"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <button
                      onClick={() => setSelectedOrder(null)}
                      className="lg:hidden p-1.5 -ml-1 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-2xl font-bold text-slate-800">{selectedOrder.inbound_number}</h2>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${statusColor(selectedOrder.status)}`}>
                      {statusLabel(selectedOrder.status)}
                    </span>
                  </div>
                  <p className="text-slate-500">{selectedOrder.warehouse?.name || '-'}</p>
                </div>

                <div className="flex gap-2">
                  {selectedOrder.status === 'pending' || selectedOrder.status === 'arrived' ? (
                    <button
                      onClick={() => handleVerifyStart(selectedOrder.id)}
                      disabled={isSaving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2 shadow-sm shadow-blue-200 disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                      Start Verification <ArrowRight size={16} />
                    </button>
                  ) : selectedOrder.status === 'completed' ? (
                    <button disabled className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium flex items-center gap-2 cursor-default">
                      <CheckCircle size={16} /> Completed
                    </button>
                  ) : (
                    <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold flex items-center gap-2">
                      <Layers size={16} /> In Progress
                    </div>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Stats */}
                <div className="flex gap-4 mb-8">
                  <div className="flex-1 p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-400 uppercase font-bold">Total Items</span>
                    <p className="text-lg font-semibold text-slate-700">{selectedOrder.items.reduce((s, i) => s + i.quantity, 0)} Units</p>
                  </div>
                  <div className="flex-1 p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-400 uppercase font-bold">Expected Date</span>
                    <p className="text-lg font-semibold text-slate-700">{selectedOrder.expected_arrival_date}</p>
                  </div>
                  <div className="flex-1 p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-400 uppercase font-bold">Progress</span>
                    <p className="text-lg font-semibold text-slate-700">
                      {selectedOrder.items.filter(i => itemStatusStored(i.status)).length} / {selectedOrder.items.length} Lines
                    </p>
                  </div>
                </div>

                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <FileText size={18} className="text-slate-400" />
                  Order Items & Putaway
                </h3>

                <div className="space-y-3">
                  {selectedOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                        itemStatusStored(item.status)
                          ? 'bg-emerald-50/50 border-emerald-100'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${
                          itemStatusStored(item.status) ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                        }`}>
                          <Box size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">{item.item?.item_name || '-'}</h4>
                          <p className="text-sm text-slate-500 font-mono">{item.item?.item_sku || '-'}</p>
                          <p className="text-xs text-slate-400 mt-1">Expected Qty: {item.quantity}</p>
                        </div>
                      </div>

                      <div>
                        {itemStatusStored(item.status) ? (
                          <div className="text-right">
                            <div className="flex items-center justify-end gap-1 text-emerald-600 font-bold text-sm">
                              <CheckCircle size={14} /> Stored
                            </div>
                            {item.bin_location && (
                              <p className="text-xs text-slate-500">Bin: {item.bin_location}</p>
                            )}
                            {item.rack && (
                              <p className="text-[10px] text-slate-400 uppercase">Rack {item.rack.code}  {item.rack.label}</p>
                            )}
                          </div>
                        ) : selectedOrder.status === 'verifying' ? (
                          <button
                            onClick={() => openPutawayModal(item)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 shadow-sm transition-all"
                          >
                            Verify & Store <ArrowRight size={14} />
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                            Pending Verification
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center h-full">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Truck size={32} className="text-slate-300" />
              </div>
              <h3 className="text-lg font-semibold text-slate-600">Select Inbound Order</h3>
              <p className="text-sm max-w-xs mx-auto mt-2">View details, verify items, and assign bin locations for incoming stock.</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Putaway Modal Overlay */}
      <AnimatePresence>
        {activeItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setActiveItem(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <ArrowDownToLine size={24} className="text-blue-500" />
                    Putaway Item
                  </h3>
                  <p className="text-slate-500 text-sm mt-1">{activeItem.item?.item_name || '-'}</p>
                  <p className="text-xs text-slate-400 font-mono">{activeItem.item?.item_sku || '-'}  Qty: {activeItem.quantity}</p>
                </div>
                <button onClick={() => setActiveItem(null)} className="text-slate-400 hover:text-slate-600">
                  <div className="bg-white p-1 rounded-full hover:bg-slate-200 transition-colors">
                    <span className="text-lg font-bold"></span>
                  </div>
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-8">
                {/* Rack Selection */}
                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <Grid3X3 size={16} className="text-blue-500" /> 1. Select Rack
                  </h4>

                  {isLoadingRacks ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-16 rounded-lg bg-slate-100 animate-pulse" />
                      ))}
                    </div>
                  ) : racks.length === 0 ? (
                    <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
                      No racks found for this warehouse
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {racks.map((rack) => (
                        <button
                          key={rack.id}
                          onClick={() => selectRack(rack.id)}
                          className={`p-3 rounded-lg border-2 text-left transition-all ${
                            selectedRackId === rack.id
                              ? 'bg-blue-50 border-blue-300 text-blue-800 ring-2 ring-offset-1 ring-blue-200 shadow-md'
                              : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                          }`}
                        >
                          <span className="block font-bold text-lg">Rack {rack.code}</span>
                          <span className="text-[10px] uppercase font-bold opacity-70">{rack.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bin Selection */}
                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <MapPin size={16} className="text-blue-500" /> 2. Select Bin
                  </h4>

                  <AnimatePresence mode="wait">
                    {selectedRackId ? (
                      isLoadingBins ? (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                            {Array.from({ length: 8 }).map((_, i) => (
                              <div key={i} className="h-10 rounded bg-slate-200 animate-pulse" />
                            ))}
                          </div>
                        </div>
                      ) : bins.length === 0 ? (
                        <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
                          No bins found for the selected rack
                        </div>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-slate-50 p-4 rounded-xl border border-slate-200"
                        >
                          <p className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                            <MapPin size={12} /> Bins in Rack {selectedRack?.code}
                          </p>
                          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                            {bins.map((bin) => {
                              const isSelected = selectedBinId === bin.id;
                              const occupied = bin.is_occupied ?? false;
                              return (
                                <button
                                  key={bin.id}
                                  onClick={() => !occupied && setSelectedBinId(bin.id)}
                                  disabled={occupied}
                                  title={occupied && bin.current_item ? `Occupied: ${bin.current_item.item_name}` : bin.label}
                                  className={`py-2 rounded font-mono text-sm font-bold transition-all ${
                                    isSelected
                                      ? 'bg-blue-600 text-white shadow-md scale-105'
                                      : occupied
                                        ? 'bg-red-50 border border-red-200 text-red-400 cursor-not-allowed'
                                        : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-500'
                                  }`}
                                >
                                  {bin.code}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )
                    ) : (
                      <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
                        Select a Rack above to view available bins
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                <div className="text-sm">
                  <span className="text-slate-400">Selected Location: </span>
                  {selectedRack && selectedBin ? (
                    <span className="font-mono font-bold text-slate-800 bg-white px-2 py-1 rounded border border-slate-200">
                      {selectedRack.code}-{selectedBin.code}
                    </span>
                  ) : (
                    <span className="italic text-slate-300">None</span>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setActiveItem(null)}
                    className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmPutaway}
                    disabled={!selectedRackId || !selectedBinId || isSaving}
                    className={`px-6 py-2 text-white font-bold rounded-lg shadow-md transition-all flex items-center gap-2 ${
                      !selectedRackId || !selectedBinId || isSaving
                        ? 'bg-slate-300 cursor-not-allowed shadow-none'
                        : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                    }`}
                  >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                    {isSaving ? 'Saving...' : 'Confirm'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Inbound;
