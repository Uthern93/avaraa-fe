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
  CheckSquare,
  Square,
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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ApiDispatchItem {
  id: number;
  delivery_order_id: number;
  item_id: number;
  warehouse_id?: number;
  batch_id?: string;
  bin_id?: number;
  expiry_date?: string;
  quantity: number;
  picked_quantity?: number;
  packed_quantity?: number;
  item?: {
    id: number;
    item_sku: string;
    item_name: string;
  };
  warehouse?: {
    id: number;
    name: string;
    location: string;
  };
  bin?: {
    id: number;
    rack_id: number;
    number: string;
    code: string;
    rack?: {
      id: number;
      warehouse_id: number;
      code: string;
      label: string;
    };
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

  // Bulk selection state (pending orders only)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

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

  // ---- Bulk selection helpers ----
  const pendingPickOrders = useMemo(() => orders.filter(o => o.status === 'pending'), [orders]);
  const allPendingSelected = pendingPickOrders.length > 0 && pendingPickOrders.every(o => selectedIds.has(o.id));

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allPendingSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingPickOrders.map(o => o.id)));
    }
  };

  // ---- Bulk start picking & export ----
  const exportBulkPickingPDF = (selectedOrders: ApiDispatchOrder[]) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    selectedOrders.forEach((order, orderIdx) => {
      if (orderIdx > 0) doc.addPage();

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      doc.text('Pick List', 14, 22);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(
        `Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
        14, 30,
      );
      doc.text(`Order ${orderIdx + 1} of ${selectedOrders.length}`, pageWidth - 14, 30, { align: 'right' });

      doc.setDrawColor(200);
      doc.line(14, 34, pageWidth - 14, 34);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      doc.text('Order Details', 14, 44);

      const details = [
        ['Order Number', order.order_number],
        ['Customer', order.is_current_user ? 'Current Customer' : (order.user?.name || '-')],
        ['Status', 'Picking Started'],
        ['Priority', (order.priority || 'normal').replace(/\b\w/g, c => c.toUpperCase())],
        ['Due Date', order.due_date],
        ['Total Items', `${order.items.length}`],
        ['Total Units', `${order.items.reduce((s, i) => s + i.quantity, 0)}`],
      ];

      autoTable(doc, {
        startY: 48,
        head: [],
        body: details,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 45, textColor: [100, 100, 100] },
          1: { cellWidth: 'auto' },
        },
        margin: { left: 14, right: 14 },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      doc.text('Items to Pick', 14, finalY);

      const itemRows = order.items.map((item, idx) => [
        `${idx + 1}`,
        item.item?.item_sku || '-',
        item.item?.item_name || '-',
        item.bin?.rack?.code || '-',
        item.bin?.code || '-',
        `${item.quantity}`,
      ]);

      autoTable(doc, {
        startY: finalY + 4,
        head: [['#', 'SKU', 'Item Name', 'Rack', 'Bin', 'Qty']],
        body: itemRows,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: {
          fillColor: [51, 65, 85],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 30, font: 'courier' },
          2: { cellWidth: 'auto' },
          3: { cellWidth: 22, halign: 'center' },
          4: { cellWidth: 22, halign: 'center' },
          5: { cellWidth: 18, halign: 'center' },
        },
        margin: { left: 14, right: 14 },
      });
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Bulk Pick List \u2014 Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' },
      );
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    doc.save(`Pick-List-${timestamp}.pdf`);
  };

  const handleBulkStartPicking = async () => {
    const selected = orders.filter(o => selectedIds.has(o.id));
    if (selected.length === 0) return;

    setIsBulkProcessing(true);
    try {
      exportBulkPickingPDF(selected);

      await apiClient.post('/dispatch-requests/bulk-start-picking', {
        dispatch_ids: selected.map(o => o.id),
      });

      toast.success(`Picking started for ${selected.length} order(s) & PDF exported`);
      setSelectedIds(new Set());
      fetchOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Bulk start picking failed');
    } finally {
      setIsBulkProcessing(false);
    }
  };

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

  // ---- Download Delivery Order (PDF) ----
  const downloadDeliveryOrder = (order: ApiDispatchOrder) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Delivery Order', 14, 22);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(
      `Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      14, 30,
    );

    doc.setDrawColor(200);
    doc.line(14, 34, pageWidth - 14, 34);

    // Order Details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Order Details', 14, 44);

    const details = [
      ['Order Number', order.order_number],
      ['Customer', order.is_current_user ? 'Current Customer' : (order.user?.name || '-')],
      ['Status', statusLabel(order.status)],
      ['Priority', (order.priority || 'normal').replace(/\b\w/g, c => c.toUpperCase())],
      ['Due Date', order.due_date],
      ['Created At', order.created_at ? order.created_at.split('T')[0] : '-'],
      ['Notes', order.notes || '-'],
      ['Total Items', `${order.items.length}`],
      ['Total Units', `${order.items.reduce((s, i) => s + i.quantity, 0)}`],
    ];

    autoTable(doc, {
      startY: 48,
      head: [],
      body: details,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 45, textColor: [100, 100, 100] },
        1: { cellWidth: 'auto' },
      },
      margin: { left: 14, right: 14 },
    });

    // Items Table
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Order Items', 14, finalY);

    const itemRows = order.items.map((item, idx) => [
      `${idx + 1}`,
      item.item?.item_sku || '-',
      item.item?.item_name || '-',
      item.bin?.rack?.code || '-',
      item.bin?.code || '-',
      `${item.quantity}`,
    ]);

    autoTable(doc, {
      startY: finalY + 4,
      head: [['#', 'SKU', 'Item Name', 'Rack', 'Bin', 'Qty']],
      body: itemRows,
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 30, font: 'courier' },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 22, halign: 'center' },
        4: { cellWidth: 22, halign: 'center' },
        5: { cellWidth: 18, halign: 'center' },
      },
      margin: { left: 14, right: 14 },
    });

    // Signature area
    const sigY = (doc as any).lastAutoTable.finalY + 16;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);

    // Footer on every page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `DO-${order.order_number} \u2014 Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' },
      );
    }

    doc.save(`DO-${order.order_number}.pdf`);
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
        {activeTab === 'PICKING' && pendingPickOrders.length > 0 && (
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 mt-3 text-xs text-slate-500 hover:text-blue-600 transition-colors"
          >
            {allPendingSelected
              ? <CheckSquare size={14} className="text-blue-600" />
              : <Square size={14} />}
            Select all pending ({pendingPickOrders.length})
          </button>
        )}
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
                className={`bg-white rounded-xl shadow-sm border overflow-hidden cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group ${
                  selectedIds.has(order.id) ? 'border-blue-300 bg-blue-50/30' : 'border-slate-100'
                }`}
              >
                <div className="p-4 flex flex-col sm:flex-row gap-4 items-center">
                  {/* Checkbox for pending orders in PICKING tab */}
                  {activeTab === 'PICKING' && order.status === 'pending' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelect(order.id); }}
                      className="flex-shrink-0 text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      {selectedIds.has(order.id)
                        ? <CheckSquare size={20} className="text-blue-600" />
                        : <Square size={20} />}
                    </button>
                  )}
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

        {/* Bulk action bar */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="bg-white rounded-xl shadow-md border border-blue-200 p-4 flex items-center justify-between gap-3 sticky bottom-0"
            >
              <span className="text-sm font-semibold text-blue-700">
                {selectedIds.size} order{selectedIds.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear
                </Button>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5"
                  onClick={handleBulkStartPicking}
                  disabled={isBulkProcessing}
                >
                  {isBulkProcessing ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  Start Picking & Export
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
                              {item.bin && (
                                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                                  <MapPin size={10} />
                                  <span>{item.bin.rack?.code ? `${item.bin.rack.code} — ` : ''}{item.bin.code}</span>
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
