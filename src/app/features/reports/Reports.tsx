import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CalendarDays,
  BarChart3,
  RefreshCw,
  ListFilter,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/hooks/useApi';
import { PaginationControls } from '@/app/components/ui/pagination-controls';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ColumnDef {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: Record<string, any>) => React.ReactNode;
}

interface SortState {
  column: string;
  direction: 'asc' | 'desc';
}

interface PaginationMeta {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
  from: number | null;
  to: number | null;
}

// Current month as YYYY-MM
const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// Format date helper
const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

// Format weight
const formatWeight = (val: number | string | null | undefined) => {
  if (val == null || val === '') return '-';
  const num = Number(val);
  return isNaN(num) ? String(val) : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Type badge
const TypeBadge = ({ type }: { type: string }) => {
  if (!type) return <span>-</span>;
  const colors: Record<string, string> = {
    inbound: 'bg-blue-100 text-blue-700',
    outbound: 'bg-emerald-100 text-emerald-700',
  };
  const label = type.replace(/\b\w/g, c => c.toUpperCase());
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${colors[type] || 'bg-slate-100 text-slate-600'}`}>
      {label}
    </span>
  );
};

// Format month for display
const formatMonth = (month: string) => {
  try {
    const [y, m] = month.split('-');
    return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  } catch {
    return month;
  }
};

const reportColumns: ColumnDef[] = [
  { key: 'r_type', label: 'Type', render: (v) => <TypeBadge type={v} /> },
  { key: 'r_order_date', label: 'Order Date', sortable: true, render: (v) => formatDate(v) },
  { key: 'r_order_no', label: 'Order No.', sortable: true, render: (v) => <span className="font-semibold text-slate-800">{v}</span> },
  { key: 'r_sku', label: 'SKU', sortable: true, render: (v) => <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{v || '-'}</span> },
  { key: 'r_description', label: 'Description', sortable: true },
  { key: 'r_batch', label: 'Batch', render: (v) => v ? <span className="text-xs font-mono bg-amber-50 px-1.5 py-0.5 rounded text-amber-700">{v}</span> : '-' },
  { key: 'r_qty', label: 'Qty', align: 'center', sortable: true, render: (v) => <span className="font-semibold">{v ?? 0}</span> },
  { key: 'r_weight', label: 'Weight', align: 'right', sortable: true, render: (v) => formatWeight(v) },
  { key: 'entry_date', label: 'Entry Date', sortable: true, render: (v) => formatDate(v) },
];

export function Reports() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [typeFilter, setTypeFilter] = useState('all');

  // Data
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [meta, setMeta] = useState<PaginationMeta>({
    currentPage: 1, lastPage: 1, perPage: 25, total: 0, from: null, to: null,
  });

  // Sort
  const [sort, setSort] = useState<SortState | null>(null);

  // Search (client-side on current page)
  const [searchTerm, setSearchTerm] = useState('');

  // Reset page when month or type changes
  useEffect(() => {
    setCurrentPage(1);
  }, [month, typeFilter]);

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('month', month);
      params.set('page', String(currentPage));
      params.set('per_page', String(perPage));
      if (typeFilter !== 'all') {
        params.set('type', typeFilter);
      }
      if (sort) {
        params.set('sort_by', sort.column);
        params.set('sort_dir', sort.direction);
      }

      const res = await apiClient.get(`/stock-movements?${params.toString()}`);
      const payload = res.data?.data ?? res.data;

      if (payload?.data && payload.current_page) {
        setRows(payload.data);
        setMeta({
          currentPage: payload.current_page,
          lastPage: payload.last_page,
          perPage: payload.per_page,
          total: payload.total,
          from: payload.from,
          to: payload.to,
        });
      } else {
        const list = Array.isArray(payload) ? payload : (payload?.data ?? []);
        setRows(list);
        setMeta({
          currentPage: 1, lastPage: 1, perPage: list.length,
          total: list.length, from: list.length > 0 ? 1 : null, to: list.length > 0 ? list.length : null,
        });
      }
    } catch {
      toast.error('Failed to load report');
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [month, typeFilter, currentPage, perPage, sort]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Sort toggle
  const toggleSort = (column: string) => {
    setSort(prev => {
      if (prev?.column === column) {
        return prev.direction === 'asc' ? { column, direction: 'desc' } : null;
      }
      return { column, direction: 'asc' };
    });
    setCurrentPage(1);
  };

  const getValue = (row: Record<string, any>, key: string): any =>
    key.split('.').reduce((obj, k) => obj?.[k], row);

  // Client-side search filter
  const filteredRows = searchTerm
    ? rows.filter(row =>
        reportColumns.some(col => {
          const val = getValue(row, col.key);
          return val != null && String(val).toLowerCase().includes(searchTerm.toLowerCase());
        })
      )
    : rows;

  // PDF export
  const handleExportPDF = () => {
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.getWidth();

    const typeLabel = typeFilter === 'all' ? 'All' : typeFilter === 'inbound' ? 'Inbound' : 'Outbound';
    const title = `Stock Movements Report — ${typeLabel}`;

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 20);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Month: ${formatMonth(month)}  —  Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 14, 27);

    doc.setDrawColor(200);
    doc.line(14, 30, pageWidth - 14, 30);

    const head = reportColumns.map(c => c.label);
    const body = filteredRows.map(row =>
      reportColumns.map(col => {
        const val = getValue(row, col.key);
        if (val == null) return '-';
        return String(val);
      })
    );

    autoTable(doc, {
      startY: 34,
      head: [head],
      body,
      theme: 'striped',
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(
        `${title} — ${formatMonth(month)} — Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' },
      );
    }

    doc.save(`stock-movements-${typeFilter}-${month}.pdf`);
    toast.success('PDF exported');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 size={24} className="text-blue-600" />
            Reports
          </h2>
          <p className="text-slate-500 text-sm">View and export stock movement reports.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportPDF}
          disabled={filteredRows.length === 0}
          className="text-slate-600"
        >
          <FileText size={14} className="mr-1.5" /> Export PDF
        </Button>
      </div>

      {/* Single table card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Filters bar */}
        <div className="p-4 flex flex-col sm:flex-row gap-3 items-end border-b border-slate-100">
          {/* Month */}
          <div className="w-full sm:w-48">
            <Label className="text-[10px] uppercase text-slate-400 font-bold flex items-center gap-1 mb-1">
              <CalendarDays size={12} /> Month
            </Label>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value || getCurrentMonth())}
              className="h-9 text-sm"
            />
          </div>

          {/* Type */}
          <div className="w-full sm:w-48">
            <Label className="text-[10px] uppercase text-slate-400 font-bold flex items-center gap-1 mb-1">
              <ListFilter size={12} /> Type
            </Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="inbound">Inbound</SelectItem>
                <SelectItem value="outbound">Outbound</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search orders, SKU, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Refresh */}
          <Button variant="outline" size="sm" onClick={fetchData} className="h-9 px-3 text-slate-600 shrink-0">
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </Button>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200">
                <th className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-10 text-center">#</th>
                {reportColumns.map(col => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'} ${col.sortable ? 'cursor-pointer select-none hover:text-slate-600 transition-colors' : ''}`}
                    onClick={() => col.sortable && toggleSort(col.key)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {col.sortable && (
                        sort?.column === col.key ? (
                          sort.direction === 'asc' ? <ArrowUp size={12} className="text-blue-500" /> : <ArrowDown size={12} className="text-blue-500" />
                        ) : (
                          <ArrowUpDown size={12} className="opacity-30" />
                        )
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3"><div className="h-4 w-6 bg-slate-100 rounded mx-auto" /></td>
                    {reportColumns.map(col => (
                      <td key={col.key} className="px-4 py-3">
                        <div className="h-4 bg-slate-100 rounded" style={{ width: `${40 + Math.random() * 60}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={reportColumns.length + 1} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center">
                      <Search size={28} className="mb-2 opacity-30" />
                      <p className="font-medium text-slate-500 text-sm">No data found</p>
                      <p className="text-xs mt-1">
                        {searchTerm ? 'Try adjusting your search' : 'No stock movement records for this month'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr key={row.id ?? idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-400 text-center">
                      {(meta.from ?? 0) + idx}
                    </td>
                    {reportColumns.map(col => {
                      const value = getValue(row, col.key);
                      return (
                        <td
                          key={col.key}
                          className={`px-4 py-3 text-sm text-slate-700 ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : ''}`}
                        >
                          {col.render ? col.render(value, row) : (value ?? '-')}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.total > 0 && (
          <PaginationControls
            currentPage={meta.currentPage}
            lastPage={meta.lastPage}
            perPage={meta.perPage}
            total={meta.total}
            from={meta.from}
            to={meta.to}
            onPageChange={setCurrentPage}
            onPerPageChange={(pp) => { setPerPage(pp); setCurrentPage(1); }}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}

export default Reports;
