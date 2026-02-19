import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { Toaster } from 'sonner';
import { 
  LayoutDashboard, 
  Package, 
  Truck,
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Settings, 
  User, 
  Menu, 
  X, 
  LogOut,
  ClipboardList,
  Map,
  Boxes,
  Tag,
  FileBarChart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { useAuthContext } from '@/hooks/useAuth';

// Role slugs that match your database
export type RoleSlug = 'admin' | 'manager' | 'staff' | 'customer';

interface SidebarItem {
  id: string;
  path: string;
  label: string;
  icon: React.ElementType;
  roles: RoleSlug[];
}

// Navigation Config with paths - roles use database slugs
export const NAVIGATION_ITEMS: SidebarItem[] = [
  { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'customer'] },
  { id: 'inventory', path: '/inventory', label: 'Item Master', icon: Tag, roles: ['admin', 'manager'] },
  { id: 'inbound', path: '/inbound', label: 'Inbound & Putaway', icon: ArrowDownToLine, roles: ['admin', 'manager', 'staff'] },
  { id: 'pick-pack', path: '/pick-pack', label: 'Pick and Pack', icon: ClipboardList, roles: ['admin', 'manager', 'staff'] },
  { id: 'dispatch', path: '/dispatch', label: 'Dispatch', icon: Truck, roles: ['admin', 'manager', 'staff'] },
  // { id: 'returns', path: '/returns', label: 'Return', icon: ArrowUpFromLine, roles: ['admin', 'manager'] },
  { id: 'warehouse', path: '/warehouse/map', label: 'Warehouse Map', icon: Map, roles: ['admin', 'manager'] },
  { id: 'reports', path: '/reports', label: 'Reports', icon: FileBarChart, roles: ['admin', 'manager'] },
  // { id: 'settings', path: '/settings', label: 'Setup', icon: Settings, roles: ['admin'] },
];

export default function RootLayout() {
  const { user, logout } = useAuthContext();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();

  // Get current user's role slug
  const currentRoleSlug = user?.role?.slug;

  // Filter nav items based on user's role
  const filteredNav = NAVIGATION_ITEMS.filter(item => item.roles.includes(currentRoleSlug as RoleSlug));

  // Get active page from current path
  const getActivePage = () => {
    const path = location.pathname;
    const item = NAVIGATION_ITEMS.find(nav => path.startsWith(nav.path));
    return item?.id || 'dashboard';
  };

  const activePage = getActivePage();

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="h-screen bg-slate-50 text-slate-900 font-sans flex overflow-hidden">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        className={clsx(
          "fixed lg:static inset-y-0 left-0 z-50 bg-white border-r border-slate-200 flex flex-col transition-all duration-300",
          isSidebarOpen ? "w-64" : "w-20",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className={clsx(
          "h-16 flex items-center border-b border-slate-200 shrink-0",
          isSidebarOpen ? "px-6 justify-between" : "px-4 justify-center"
        )}>
          {isSidebarOpen ? (
            <>
              <div className="flex items-center gap-3">
                <img 
                  src="/assets/images/SNIV-logo.png" 
                  alt="SNIV Logo" 
                  className="h-9 w-9 rounded-lg object-contain"
                />
                <span className="text-xl font-bold text-slate-800">SNIV</span>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                title="Collapse sidebar"
              >
                <X size={18} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="w-9 h-9 rounded-lg flex items-center justify-center hover:opacity-90 transition-opacity"
              title="Expand sidebar"
            >
              <img 
                src="/assets/images/SNIV-logo.png" 
                alt="SNIV Logo" 
                className="h-9 w-9 rounded-lg object-contain"
              />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          <ul className="space-y-1">
            {filteredNav.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavigation(item.path)}
                    className={clsx(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                      isActive 
                        ? "bg-blue-50 text-blue-600 font-semibold" 
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                      !isSidebarOpen && "justify-center"
                    )}
                    title={!isSidebarOpen ? item.label : undefined}
                  >
                    <Icon size={20} className="shrink-0" />
                    {isSidebarOpen && <span className="text-sm whitespace-nowrap">{item.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className={clsx(
          "border-t border-slate-200 p-3 shrink-0",
          !isSidebarOpen && "flex flex-col items-center"
        )}>
          {/* User Info */}
          <div className={clsx("px-2", !isSidebarOpen && "hidden")}>
            <p className="text-xs text-slate-500 font-medium">Logged in as</p>
            <p className="text-sm font-semibold text-slate-700 truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-slate-400 truncate">{user?.role?.name || 'No Role'}</p>
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
            >
              <Menu size={22} />
            </button>
            <h1 className="text-lg font-semibold text-slate-800 capitalize">
              {NAVIGATION_ITEMS.find(i => i.id === activePage)?.label || 'Warehouse'}
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              {user?.role?.name || 'Guest'}
            </div>
            <button className="p-2 rounded-full hover:bg-slate-100 text-slate-600">
              <User size={20} />
            </button>
            <button 
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="p-2 rounded-full hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
      
      <Toaster position="top-right" />
    </div>
  );
}
