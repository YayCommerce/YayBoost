/**
 * Router configuration for YayBoost Admin
 * Uses hash-based routing for WordPress admin compatibility
 */

import { lazy, Suspense } from 'react';
import { DashboardLayout } from '@/layouts/dashboard-layout';
import { HashRouter, Route, Routes } from 'react-router-dom';

// Lazy load pages
const Dashboard = lazy(() => import('@/pages/dashboard'));
const FeaturePage = lazy(() => import('@/pages/feature'));
const GlobalSettings = lazy(() => import('@/pages/settings'));

// Loading component
function PageLoading() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
    </div>
  );
}

export function Router() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route
            index
            element={
              <Suspense fallback={<PageLoading />}>
                <Dashboard />
              </Suspense>
            }
          />
          <Route
            path="features"
            element={
              <Suspense fallback={<PageLoading />}>
                <FeaturePage />
              </Suspense>
            }
          />
          <Route
            path="features/:featureId/*"
            element={
              <Suspense fallback={<PageLoading />}>
                <FeaturePage />
              </Suspense>
            }
          />
          <Route
            path="settings"
            element={
              <Suspense fallback={<PageLoading />}>
                <GlobalSettings />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </HashRouter>
  );
}
