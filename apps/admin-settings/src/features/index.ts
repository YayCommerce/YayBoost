/**
 * Feature Registry
 *
 * Register all feature components here. Each feature module exports a default component
 * that will be lazy-loaded when the user navigates to that feature.
 *
 * To add a new feature:
 * 1. Create a folder in src/features/{feature-id}/
 * 2. Create an index.tsx with the main component (default export)
 * 3. Register it below in the featureComponents map
 */

import { ComponentType, lazy } from 'react';

// Feature component props
export interface FeatureComponentProps {
  featureId: string;
}

// Registry of feature components (lazy loaded)
export const featureComponents: Record<string, React.LazyExoticComponent<ComponentType<FeatureComponentProps>>> = {
  // Sample boost feature (Recently Viewed Products)
  sample_boost: lazy(() => import('./sample-boost')),

  // Free Shipping Bar (simple, settings-only)
  free_shipping_bar: lazy(() => import('./free-shipping-bar')),

  // Order Bump (complex, with entity CRUD)
  order_bump: lazy(() => import('./order-bump')),

  smart_recommendations: lazy(() => import('./smart-recommendations')),
};

/**
 * Get feature component by ID
 * Returns null if feature doesn't have a registered component
 */
export function getFeatureComponent(featureId: string) {
  return featureComponents[featureId] ?? null;
}

/**
 * Check if a feature has a registered component
 */
export function hasFeatureComponent(featureId: string) {
  return featureId in featureComponents;
}
