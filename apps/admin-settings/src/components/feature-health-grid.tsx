/**
 * Feature Health Grid Component
 *
 * Displays all features with their health status indicators.
 * Health: green (active), yellow (enabled but no data), gray (disabled)
 *
 * Design: Modern card grid with visual health indicators and hover interactions
 */

import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { __ } from '@wordpress/i18n';
import {
  Activity,
  ChevronRight,
  Eye,
  ShoppingCart,
  Sparkles,
  Ticket,
  Timer,
  Truck,
  Users,
  Zap,
  SquareArrowOutUpRight,
} from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { dashboardApi, FeatureHealthResponse } from '@/lib/api';

// Icon mapping for features
const FEATURE_ICONS: Record<string, React.ReactNode> = {
  frequently_bought_together: <ShoppingCart className="h-4 w-4" />,
  free_shipping_bar: <Truck className="h-4 w-4" />,
  stock_scarcity: <Timer className="h-4 w-4" />,
  next_order_coupon: <Ticket className="h-4 w-4" />,
  smart_recommendations: <Sparkles className="h-4 w-4" />,
  order_bump: <Zap className="h-4 w-4" />,
  live_visitor_count: <Users className="h-4 w-4" />,
  exit_intent_popup: <SquareArrowOutUpRight className="h-4 w-4" />,
  purchase_activity_count: <Activity className="h-4 w-4" />,
};

// Health indicator config
const HEALTH_CONFIG = {
  green: {
    color: 'bg-success',
    ringColor: 'ring-success/30',
    label: __('Active', 'yayboost'),
    description: __('Receiving impressions', 'yayboost'),
  },
  yellow: {
    color: 'bg-warning',
    ringColor: 'ring-warning/30',
    label: __('No Data', 'yayboost'),
    description: __('Enabled but no impressions yet', 'yayboost'),
  },
  gray: {
    color: 'bg-muted-foreground/40',
    ringColor: 'ring-muted-foreground/20',
    label: __('Disabled', 'yayboost'),
    description: __('Feature is turned off', 'yayboost'),
  },
};

function FeatureCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-3 w-3 rounded-full" />
      </div>
      <div className="mt-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function FeatureHealthGrid() {
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery<FeatureHealthResponse>({
    queryKey: ['dashboard', 'health'],
    queryFn: () => dashboardApi.getFeatureHealth(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  if (error) {
    return null;
  }

  const features = data?.features || [];

  return (
    <div className="relative overflow-hidden rounded-xl border bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">{__('Feature Health', 'yayboost')}</h3>
            {data?.date_range && (
              <p className="text-xs text-muted-foreground">{__('Last 7 days', 'yayboost')}</p>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="hidden items-center gap-3 sm:flex">
          {Object.entries(HEALTH_CONFIG).map(([key, config]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className={cn('h-2 w-2 rounded-full', config.color)} />
              <span className="text-xs text-muted-foreground">{config.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid content */}
      <div className="p-4">
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <FeatureCardSkeleton />
            <FeatureCardSkeleton />
            <FeatureCardSkeleton />
            <FeatureCardSkeleton />
          </div>
        ) : features.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Sparkles className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {__('No features available', 'yayboost')}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {features.map((feature) => {
              const healthConfig = HEALTH_CONFIG[feature.health];
              const icon = FEATURE_ICONS[feature.id] || <Sparkles className="h-4 w-4" />;

              return (
                <button
                  key={feature.id}
                  onClick={() => navigate({ to: feature.path })}
                  className={cn(
                    'group relative flex flex-col rounded-xl border p-4 text-left transition-all duration-200',
                    'cursor-pointer hover:shadow-md',
                    feature.enabled
                      ? 'border-border bg-card hover:border-primary/30 hover:bg-primary/[0.02]'
                      : 'border-border bg-muted/20 hover:bg-muted/40',
                  )}
                >
                  {/* Top row: Icon + Health indicator */}
                  <div className="flex items-start justify-between">
                    <div
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-200',
                        feature.enabled
                          ? 'bg-primary/10 text-primary group-hover:bg-primary/15'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {icon}
                    </div>

                    {/* Health indicator with ring */}
                    <div
                      className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-full ring-2',
                        healthConfig.ringColor,
                      )}
                      title={healthConfig.description}
                    >
                      <div className={cn('h-2.5 w-2.5 rounded-full', healthConfig.color)} />
                    </div>
                  </div>

                  {/* Feature info */}
                  <div className="mt-3 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium leading-snug">{feature.name}</p>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" />
                    </div>

                    {/* Status row */}
                    <div className="mt-1.5 flex items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium',
                          feature.enabled
                            ? 'bg-success/10 text-success'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {feature.enabled ? __('Enabled', 'yayboost') : __('Disabled', 'yayboost')}
                      </span>

                      {feature.enabled && feature.impressions > 0 && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Eye className="h-3 w-3" />
                          {feature.impressions.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile legend */}
      <div className="flex items-center justify-center gap-4 border-t bg-muted/30 px-4 py-2.5 sm:hidden">
        {Object.entries(HEALTH_CONFIG).map(([key, config]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={cn('h-2 w-2 rounded-full', config.color)} />
            <span className="text-xs text-muted-foreground">{config.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FeatureHealthGrid;
