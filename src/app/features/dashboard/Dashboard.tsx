// =============================================================================
// DASHBOARD MODULE — API-DRIVEN
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Package,
  Truck,
  ArrowDownToLine,
  Clock,
  CalendarDays,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { apiClient } from '@/hooks/useApi';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

interface ApiKPI {
  total_inventory: number;
  inventory_change: string;
  pending_inbound: number;
  pending_inbound_today: number;
  to_dispatch: number;
  urgent_orders: number;
}

interface ApiWeeklyMovement {
  name: string;
  inbound: number;
  outbound: number;
}

interface ApiExpiryItem {
  id: number;
  item_name: string;
  item_sku: string;
  quantity: number;
  expiry_date: string;
  days_until_expiry: number;
  status: 'critical' | 'warning';
  warehouse_name: string;
  bin_code: string;
}

interface ApiUrgentTask {
  id: number;
  type: string;
  reference_id: string;
  priority: string;
  status: string;
  time: string;
  created_at: string;
}

interface ApiDashboardData {
  as_of: string;
  kpi: ApiKPI;
  weekly_movement: ApiWeeklyMovement[];
  expiring_items: ApiExpiryItem[];
  urgent_tasks: ApiUrgentTask[];
}

// -----------------------------------------------------------------------------
// COMPONENTS
// -----------------------------------------------------------------------------

interface KPICardProps {
  title: string;
  value: string | number;
  subtext: string;
  icon: React.ElementType;
  color: string;
}

const KPICard = ({ title, value, subtext, icon: Icon, color }: KPICardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-start justify-between"
  >
    <div>
      <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
      <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
      <p className={`text-xs mt-2 font-medium ${String(subtext).includes('+') ? 'text-emerald-600' : 'text-slate-400'}`}>
        {subtext}
      </p>
    </div>
    <div className={`p-3 rounded-lg ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
  </motion.div>
);

// Helper: format "days_until_expiry" into readable text
function expiryLabel(days: number): string {
  if (days <= 0) return 'Expired';
  if (days === 1) return '1 Day';
  if (days < 30) return `${days} Days`;
  return `${Math.floor(days / 30)} Month${Math.floor(days / 30) > 1 ? 's' : ''}`;
}

// Helper: task type icon
function TaskIcon({ type }: { type: string }) {
  const t = type.toLowerCase();
  if (t === 'pick' || t === 'pack') return <Package size={16} />;
  if (t === 'dispatch') return <Truck size={16} />;
  return <Clock size={16} />;
}

// Capitalize first letter
function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------

export function Dashboard() {
  const [data, setData] = useState<ApiDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get('/dashboard')
      .then((res) => {
        setData(res.data?.data ?? res.data);
      })
      .catch(() => toast.error('Failed to load dashboard data'))
      .finally(() => setIsLoading(false));
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  // Error / empty state
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <AlertTriangle className="text-amber-400 mb-3" size={36} />
        <h3 className="text-slate-600 font-semibold">Could not load dashboard</h3>
        <p className="text-slate-400 text-sm">Please try refreshing the page.</p>
      </div>
    );
  }

  const { kpi, weekly_movement, expiring_items, urgent_tasks } = data;

  return (
    <div className="space-y-6">
      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <KPICard
          title="Total Inventory"
          value={kpi.total_inventory.toLocaleString()}
          subtext={kpi.inventory_change}
          icon={Package}
          color="bg-blue-500"
        />
        <KPICard
          title="Pending Inbound"
          value={kpi.pending_inbound}
          subtext={`${kpi.pending_inbound_today} arriving today`}
          icon={ArrowDownToLine}
          color="bg-purple-500"
        />
        <KPICard
          title="To Dispatch"
          value={kpi.to_dispatch}
          subtext={`${kpi.urgent_orders} urgent orders`}
          icon={Truck}
          color="bg-emerald-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart + Expiry */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Chart Widget */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800">Weekly Movement</h3>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  <span className="text-slate-600">Inbound</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  <span className="text-slate-600">Outbound</span>
                </div>
              </div>
            </div>
            <div className="h-80 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekly_movement} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                  <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="inbound" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="outbound" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expiry Widget */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CalendarDays className="text-amber-500" size={20} />
                Expiry
              </h3>
            </div>

            {expiring_items.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">No items nearing expiry.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-2 rounded-l-lg">Item</th>
                      <th className="px-4 py-2">Qty</th>
                      <th className="px-4 py-2">Expires In</th>
                      <th className="px-4 py-2">Location</th>
                      <th className="px-4 py-2 rounded-r-lg text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expiring_items.map((item) => (
                      <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-700">{item.item_name}</p>
                          <p className="text-xs text-slate-400">{item.item_sku}</p>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-600">{item.quantity}</td>
                        <td className="px-4 py-3 font-bold text-slate-800">{expiryLabel(item.days_until_expiry)}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          <span>{item.warehouse_name}</span>
                          <span className="ml-1 font-mono text-slate-400">({item.bin_code})</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-bold ${
                              item.status === 'critical'
                                ? 'bg-red-100 text-red-600'
                                : 'bg-amber-100 text-amber-600'
                            }`}
                          >
                            {capitalize(item.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>

        {/* Urgent Tasks Sidebar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col h-full"
        >
          <h3 className="text-lg font-bold text-slate-800 mb-4">Urgent Tasks</h3>

          {urgent_tasks.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6 flex-1">No urgent tasks.</p>
          ) : (
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {urgent_tasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100"
                >
                  <div
                    className={`p-2 rounded-md shrink-0 ${
                      task.priority === 'high'
                        ? 'bg-red-100 text-red-600'
                        : 'bg-blue-100 text-blue-600'
                    }`}
                  >
                    <TaskIcon type={task.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold text-slate-800 text-sm">
                        {capitalize(task.type)} {task.reference_id}
                      </h4>
                      <span className="text-xs text-slate-500">{task.time}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-slate-500">Priority: {capitalize(task.priority)}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 font-medium">
                        {capitalize(task.status)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default Dashboard;
