/**
 * TanStack Router Configuration
 * Uses hash-based routing for WordPress admin compatibility
 */

import { createHashHistory, createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

// Loading component
function PageLoading() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
    </div>
  );
}

// Create hash history for WordPress admin compatibility
const hashHistory = createHashHistory();

// Create and export router
export const router = createRouter({
  routeTree,
  history: hashHistory,
  defaultPreload: 'intent',
  defaultPendingComponent: PageLoading,
});

// Type-safe router declaration
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
