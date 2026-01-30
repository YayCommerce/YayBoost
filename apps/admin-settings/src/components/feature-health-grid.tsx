/**
 * Feature Health Grid Component
 *
 * Displays all features with their health status indicators.
 * Health: green (active), yellow (enabled but no data), gray (disabled)
 */

import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { __ } from '@wordpress/i18n';
import {
  Activity,
  MessageSquare,
  ShoppingCart,
  Sparkles,
  SquareArrowOutUpRight,
  Ticket,
  Timer,
  Truck,
  Users,
  Zap,
} from 'lucide-react';

import { dashboardApi, FeatureHealthResponse } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Icon mapping for features
const FEATURE_ICONS: Record<string, React.ReactNode> = {
  frequently_bought_together: <ShoppingCart className="h-5 w-5" />,
  free_shipping_bar: <Truck className="h-5 w-5" />,
  stock_scarcity: <Timer className="h-5 w-5" />,
  next_order_coupon: <Ticket className="h-5 w-5" />,
  smart_recommendations: <Sparkles className="h-5 w-5" />,
  order_bump: <Zap className="h-5 w-5" />,
  live_visitor_count: <Users className="h-5 w-5" />,
  exit_intent_popup: <SquareArrowOutUpRight className="h-5 w-5" />,
  recent_purchase_notification: <MessageSquare className="h-5 w-5" />,
};

// Health indicator colors and labels
const HEALTH_CONFIG = {
  green: {
    color: 'bg-[#279727]',
    label: __('Active', 'yayboost'),
    description: __('Receiving impressions', 'yayboost'),
  },
  yellow: {
    color: 'bg-[#F9BD09]',
    label: __('No Data', 'yayboost'),
    description: __('Enabled but no impressions yet', 'yayboost'),
  },
  gray: {
    color: 'bg-[#c9c9c9]',
    label: __('Disabled', 'yayboost'),
    description: __('Feature is turned off', 'yayboost'),
  },
};

function FeatureCardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <Skeleton className="h-10 w-10 rounded-lg" />
      <div className="flex-1">
        <Skeleton className="mb-1 h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-3 w-3 rounded-full" />
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="text-muted-foreground h-5 w-5" />
            <CardTitle className="text-base">{__('Feature Health', 'yayboost')}</CardTitle>
          </div>
          {data?.date_range && (
            <span className="text-muted-foreground text-xs">{__('Last 7 days', 'yayboost')}</span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <FeatureCardSkeleton />
            <FeatureCardSkeleton />
            <FeatureCardSkeleton />
            <FeatureCardSkeleton />
            <FeatureCardSkeleton />
            <FeatureCardSkeleton />
          </div>
        ) : features.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            {__('No features available', 'yayboost')}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {features.map((feature) => {
              const healthConfig = HEALTH_CONFIG[feature.health];
              const icon = FEATURE_ICONS[feature.id] || <Sparkles className="h-5 w-5" />;

              return (
                <button
                  key={feature.id}
                  onClick={() => navigate({ to: feature.path })}
                  className="hover:bg-muted/50 flex items-center gap-3 rounded-lg border p-3 text-left transition-colors"
                >
                  {/* Icon */}
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      feature.enabled
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {icon}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{feature.name}</p>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant={feature.enabled ? 'success' : 'muted'}
                        className="h-5 px-1.5 text-xs"
                      >
                        {feature.enabled ? __('On', 'yayboost') : __('Off', 'yayboost')}
                      </Badge>
                      {feature.enabled && feature.impressions > 0 && (
                        <span className="text-muted-foreground text-xs">
                          {feature.impressions.toLocaleString()} {__('views', 'yayboost')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Health indicator */}
                  <div className="flex-shrink-0" title={healthConfig.description}>
                    <div className={`h-3 w-3 rounded-full ${healthConfig.color}`} />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Legend */}
        {!isLoading && features.length > 0 && (
          <div className="border-border mt-4 flex flex-wrap gap-4 border-t pt-3">
            {Object.entries(HEALTH_CONFIG).map(([key, config]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className={`h-2 w-2 rounded-full ${config.color}`} />
                <span className="text-muted-foreground text-xs">{config.label}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default FeatureHealthGrid;
