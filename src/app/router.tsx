import { createBrowserRouter, Navigate } from 'react-router';
import React, { lazy, Suspense } from 'react';

// Layout
import RootLayout from './layouts/RootLayout';

// Auth Guards
import { RequireAuth, GuestRoute } from './components/auth';

// Lazy-loaded pages for code splitting (using .then() to handle named exports)
const Dashboard = lazy(() => import('./features/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const ItemMaster = lazy(() => import('./features/inventory/ItemMaster').then(m => ({ default: m.ItemMaster })));
const Inbound = lazy(() => import('./features/inbound/Inbound').then(m => ({ default: m.Inbound })));
const PickPack = lazy(() => import('./features/pick-pack/PickPack').then(m => ({ default: m.PickPack })));
const Dispatch = lazy(() => import('./features/dispatch/Dispatch').then(m => ({ default: m.Dispatch })));
const WarehouseMap = lazy(() => import('./features/warehouse/WarehouseMap').then(m => ({ default: m.WarehouseMap })));
const MobileScanner = lazy(() => import('./features/scanner/MobileScanner').then(m => ({ default: m.MobileScanner })));
const Reports = lazy(() => import('./features/reports/Reports').then(m => ({ default: m.Reports })));

// Auth pages
const Login = lazy(() => import('./features/auth/Login').then(m => ({ default: m.Login })));
const NotFound = lazy(() => import('./features/common/NotFound').then(m => ({ default: m.NotFound })));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center h-full min-h-[400px]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-500 text-sm">Loading...</p>
    </div>
  </div>
);

// Suspense wrapper for lazy components
const withSuspense = (Component: React.LazyExoticComponent<React.ComponentType<any>>) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
);

// Protected route wrapper - combines Suspense and RequireAuth
const withAuth = (Component: React.LazyExoticComponent<React.ComponentType<any>>) => (
  <RequireAuth>
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  </RequireAuth>
);

// Guest route wrapper - for pages only accessible when logged out
const withGuest = (Component: React.LazyExoticComponent<React.ComponentType<any>>) => (
  <GuestRoute>
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  </GuestRoute>
);

// -----------------------------------------------------------------------------
// ROUTE DEFINITIONS
// -----------------------------------------------------------------------------

export const routes = [
  {
    path: '/',
    element: (
      <RequireAuth>
        <RootLayout />
      </RequireAuth>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: withSuspense(Dashboard),
      },
      {
        path: 'inventory',
        children: [
          {
            index: true,
            element: withSuspense(ItemMaster),
          },
          {
            path: 'items',
            element: withSuspense(ItemMaster),
          },
        ],
      },
      {
        path: 'inbound',
        element: withSuspense(Inbound),
      },
      {
        path: 'pick-pack',
        element: withSuspense(PickPack),
      },
      {
        path: 'dispatch',
        element: withSuspense(Dispatch),
      },
      {
        path: 'warehouse',
        children: [
          {
            path: 'map',
            element: withSuspense(WarehouseMap),
          },
        ],
      },
      {
        path: 'returns',
        element: (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <div className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl font-bold">?</span>
            </div>
            <h3 className="text-lg font-medium text-slate-600">Returns Module</h3>
            <p className="text-sm">This module is part of the full enterprise suite.</p>
          </div>
        ),
      },
      {
        path: 'reports',
        element: withSuspense(Reports),
      },
      {
        path: 'settings',
        element: (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <div className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl font-bold">?</span>
            </div>
            <h3 className="text-lg font-medium text-slate-600">Settings Module</h3>
            <p className="text-sm">This module is part of the full enterprise suite.</p>
          </div>
        ),
      },
      {
        path: '*',
        element: withSuspense(NotFound),
      },
    ],
  },
  {
    path: '/scanner',
    element: withAuth(MobileScanner),
  },
  {
    path: '/login',
    element: withGuest(Login),
  },
];

// Create the router instance
export const router = createBrowserRouter(routes);

export default router;
