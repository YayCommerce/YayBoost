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

// Default error component for router-level errors
function RouterErrorComponent({ error }: { error: Error }) {
  console.error('=== ROUTER ERROR ===', error);
  return (
    <div className="p-6 bg-red-50 border border-red-200 rounded-lg m-4">
      <h2 className="text-red-800 font-bold text-lg mb-2">Router Error</h2>
      <pre className="bg-red-100 p-4 rounded overflow-auto text-xs whitespace-pre-wrap">
        {error.message}
        {'\n\n'}
        {error.stack}
      </pre>
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
  defaultErrorComponent: RouterErrorComponent,
});

// Type-safe router declaration
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
