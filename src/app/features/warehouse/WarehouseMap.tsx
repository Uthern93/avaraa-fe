// =============================================================================
// WAREHOUSE MAP MODULE — API-DRIVEN
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Box,
  Package,
  Loader2,
  Warehouse,
  MapPin,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { toast } from 'sonner';
import { apiClient } from '@/hooks/useApi';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

interface ApiBinItem {
  id: number;
  item_sku: string;
  item_name: string;
  quantity: number;
  batch_id: string;
  expiry_date: string | null;
}

interface ApiBin {
  id: number;
  rack_id: number;
  number: string;
  code: string;
  is_occupied: boolean;
  current_item?: ApiBinItem;
}

interface ApiRack {
  id: number;
  code: string;
  label: string;
  total_bins: number;
  occupied_bins: number;
  available_bins: number;
  bins: ApiBin[];
}

interface ApiWarehouseLayout {
  id: number;
  name: string;
  location: string;
  total_racks: number;
  total_bins: number;
  total_occupied: number;
  total_available: number;
  racks: ApiRack[];
}

interface ApiWarehouse {
  id: number;
  name: string;
  location?: string;
}

// Rack color palette (cycles for multiple racks)
const RACK_COLORS = [
  { empty: 'bg-slate-200 border-slate-300 text-slate-700 hover:bg-slate-300', occupied: 'bg-blue-200 border-blue-400 text-blue-800 hover:bg-blue-300' },
  { empty: 'bg-orange-100 border-orange-300 text-orange-700 hover:bg-orange-200', occupied: 'bg-orange-300 border-orange-500 text-orange-900 hover:bg-orange-400' },
  { empty: 'bg-yellow-100 border-yellow-300 text-yellow-700 hover:bg-yellow-200', occupied: 'bg-yellow-300 border-yellow-500 text-yellow-900 hover:bg-yellow-400' },
  { empty: 'bg-emerald-100 border-emerald-300 text-emerald-700 hover:bg-emerald-200', occupied: 'bg-emerald-300 border-emerald-500 text-emerald-900 hover:bg-emerald-400' },
  { empty: 'bg-purple-100 border-purple-300 text-purple-700 hover:bg-purple-200', occupied: 'bg-purple-300 border-purple-500 text-purple-900 hover:bg-purple-400' },
  { empty: 'bg-cyan-100 border-cyan-300 text-cyan-700 hover:bg-cyan-200', occupied: 'bg-cyan-300 border-cyan-500 text-cyan-900 hover:bg-cyan-400' },
];

// -----------------------------------------------------------------------------
// BIN COMPONENT
// -----------------------------------------------------------------------------

const BinCell = ({ bin, rackCode, colorIndex, tooltipBelow }: { bin: ApiBin; rackCode: string; colorIndex: number; tooltipBelow?: boolean }) => {
  const palette = RACK_COLORS[colorIndex % RACK_COLORS.length];
  const colorClass = bin.is_occupied ? palette.occupied : palette.empty;

  const tooltipPos = tooltipBelow
    ? 'top-full mt-2'
    : 'bottom-full mb-2';

  return (
    <div
      className={`w-16 h-16 border rounded flex items-center justify-center text-xs font-bold shadow-sm cursor-pointer transition-transform hover:scale-105 hover:z-30 active:scale-95 relative group ${colorClass}`}
    >
      {bin.code}

      {/* Tooltip */}
      <div className={`absolute ${tooltipPos} left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs p-2.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none z-50 whitespace-nowrap shadow-xl min-w-[140px]`}>
        <div className="font-bold text-slate-300 border-b border-slate-700 pb-1 mb-1.5">
          Rack {rackCode} — Bin {bin.code}
        </div>
        {bin.is_occupied && bin.current_item ? (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Package size={11} className="text-blue-400" />
              <span className="font-medium">{bin.current_item.item_name}</span>
            </div>
            <div className="text-slate-400 text-[10px]">{bin.current_item.item_sku}</div>
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-400">Qty:</span>
              <span className="font-bold text-emerald-400">{bin.current_item.quantity}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-400">Batch:</span>
              <span>{bin.current_item.batch_id}</span>
            </div>
            {bin.current_item.expiry_date && (
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">Expiry:</span>
                <span>{bin.current_item.expiry_date.split('T')[0]}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-400">
            <Box size={12} /> Empty
          </div>
        )}
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// RACK VIEW COMPONENT
// -----------------------------------------------------------------------------

const RackView = ({ rack, colorIndex }: { rack: ApiRack; colorIndex: number }) => {
  // 4 columns for clean table layout; bump to 8 if many bins
  const cols = rack.bins.length > 16 ? 8 : 4;
  const rows: ApiBin[][] = [];
  for (let i = 0; i < rack.bins.length; i += cols) {
    rows.push(rack.bins.slice(i, i + cols));
  }

  return (
    <div className="flex flex-col items-center gap-3 p-5 bg-white/50 rounded-xl border border-slate-200/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all overflow-visible">
      {/* Rack Title */}
      <div className="text-center">
        <h3 className="font-bold text-slate-800 text-lg">Rack {rack.code}</h3>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded inline-block">
          {rack.label}
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-inner overflow-visible">
        <table className="border-collapse">
          {/* Column Headers */}
          <thead>
            <tr>
              <th className="w-14 h-8 text-[10px] font-bold text-slate-400 uppercase bg-slate-50 border-b border-r border-slate-200"></th>
              {Array.from({ length: cols }).map((_, cIdx) => (
                <th key={cIdx} className="w-16 h-8 text-[10px] font-bold text-slate-400 uppercase bg-slate-50 border-b border-slate-200 text-center">
                  Col {cIdx + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => (
              <tr key={rIdx}>
                {/* Row Label */}
                <td className="w-14 h-16 text-[10px] font-bold text-slate-400 bg-slate-50 border-r border-b border-slate-200 text-center px-1">
                  Row {rIdx + 1}
                </td>
                {/* Bin Cells */}
                {Array.from({ length: cols }).map((_, cIdx) => {
                  const bin = row[cIdx];
                  return (
                    <td key={cIdx} className="p-0.5 border-b border-slate-100">
                      {bin ? (
                        <BinCell bin={bin} rackCode={rack.code} colorIndex={colorIndex} tooltipBelow={rIdx < rows.length / 2} />
                      ) : (
                        <div className="w-16 h-16" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 justify-center text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
          {rack.available_bins} free
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
          {rack.occupied_bins} used
        </span>
        <span className="text-slate-400">({rack.total_bins} total)</span>
      </div>
    </div>
  );
};

export function WarehouseMap() {
  const [zoom, setZoom] = useState(1);
  const [warehouses, setWarehouses] = useState<ApiWarehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);
  const [layout, setLayout] = useState<ApiWarehouseLayout | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch warehouse list
  useEffect(() => {
    apiClient.get('/warehouses').then(res => {
      const list: ApiWarehouse[] = res.data?.data ?? res.data ?? [];
      setWarehouses(list);
      // Default to first warehouse
      if (list.length > 0 && !selectedWarehouseId) {
        setSelectedWarehouseId(list[0].id);
      }
    }).catch(() => toast.error('Failed to load warehouses'));
  }, []);

  // Fetch layout when warehouse changes
  const fetchLayout = useCallback(async () => {
    if (!selectedWarehouseId) return;
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/warehouses/${selectedWarehouseId}/layout`);
      setLayout(res.data?.data ?? res.data);
    } catch {
      toast.error('Failed to load warehouse layout');
      setLayout(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedWarehouseId]);

  useEffect(() => { fetchLayout(); }, [fetchLayout]);

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Bin Rack Map</h2>
          <p className="text-slate-500 text-sm">
            {layout ? `${layout.name} — ${layout.location}` : 'Select a warehouse to view layout'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Warehouse Selector */}
          <Select
            value={selectedWarehouseId ? String(selectedWarehouseId) : ''}
            onValueChange={(val) => setSelectedWarehouseId(Number(val))}
          >
            <SelectTrigger className="w-[220px] bg-white">
              <Warehouse size={16} className="mr-2 text-slate-400" />
              <SelectValue placeholder="Select warehouse" />
            </SelectTrigger>
            <SelectContent>
              {warehouses.map((wh) => (
                <SelectItem key={wh.id} value={String(wh.id)}>
                  {wh.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Zoom Controls */}
          <div className="flex gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
            <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(z - 0.1, 0.5))}>
              <ZoomOut size={18} />
            </Button>
            <div className="flex items-center px-2 text-sm font-mono text-slate-500 min-w-[4rem] justify-center">
              {Math.round(zoom * 100)}%
            </div>
            <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(z + 0.1, 1.5))}>
              <ZoomIn size={18} />
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Bar */}
      {layout && (
        <div className="flex items-center gap-6 bg-white rounded-xl border border-slate-200 px-5 py-3">
          <div className="flex items-center gap-2 text-sm">
            <MapPin size={14} className="text-slate-400" />
            <span className="text-slate-600 font-medium">{layout.location}</span>
          </div>
          <div className="h-4 w-px bg-slate-200"></div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-500">
              <span className="font-bold text-slate-700">{layout.total_racks}</span> Racks
            </span>
            <span className="text-slate-500">
              <span className="font-bold text-slate-700">{layout.total_bins}</span> Bins
            </span>
            <span className="text-emerald-600">
              <span className="font-bold">{layout.total_available}</span> Available
            </span>
            <span className="text-blue-600">
              <span className="font-bold">{layout.total_occupied}</span> Occupied
            </span>
          </div>
        </div>
      )}

      {/* Map Content */}
      <div className="flex-1 bg-slate-100 rounded-xl overflow-auto relative border border-slate-200 shadow-inner p-12">
        {isLoading ? (
          <div className="flex items-center justify-center h-full min-h-[300px]">
            <Loader2 className="animate-spin text-slate-400" size={32} />
          </div>
        ) : !layout || layout.racks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-fusll min-h-[300px] text-center">
            <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4">
              <Warehouse className="text-slate-400" size={28} />
            </div>
            <h3 className="text-slate-600 font-semibold">No racks found</h3>
            <p className="text-slate-400 text-sm">Select a warehouse or add racks to see the layout.</p>
          </div>
        ) : (
          <div
            className="mx-auto transition-transform origin-top-center min-w-fit"
            style={{ transform: `scale(${zoom})` }}
          >
            {/* Arrange racks: up to 3 per visual row */}
            <div className="flex flex-col gap-12 items-center">
              {(() => {
                const rows: ApiRack[][] = [];
                const racks = layout.racks;
                for (let i = 0; i < racks.length; i += 3) {
                  rows.push(racks.slice(i, i + 3));
                }
                return rows.map((row, rIdx) => (
                  <div key={rIdx} className="flex gap-12 items-start flex-wrap justify-center">
                    {row.map((rack, cIdx) => (
                      <RackView key={rack.id} rack={rack} colorIndex={rIdx * 3 + cIdx} />
                    ))}
                  </div>
                ));
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
