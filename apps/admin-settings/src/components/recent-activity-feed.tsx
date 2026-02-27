/**
 * Recent Activity Feed Component
 *
 * Displays recent significant events (purchases, add to cart, threshold reached)
 * in a timeline-style feed for the dashboard.
 *
 * Design: Modern timeline with visual hierarchy and smooth animations
 */

import { useQuery } from '@tanstack/react-query';
import { __ } from '@wordpress/i18n';
import { formatDistanceToNow } from 'date-fns';
import { BarChart3, Clock, Package, ShoppingBag, ShoppingCart, Sparkles, Truck } from 'lucide-react';

import { dashboardApi, ActivityFeedResponse, ActivityItem } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Event type configuration with semantic colors
const EVENT_CONFIG: Record<
  string,
  { icon: React.ReactNode; color: string; bgColor: string; label: string }
> = {
  purchase: {
    icon: <ShoppingBag className="h-3.5 w-3.5" />,
    color: 'text-success',
    bgColor: 'bg-success/10',
    label: __('Purchase', 'yayboost-sales-booster-for-woocommerce'),
  },
  add_to_cart: {
    icon: <ShoppingCart className="h-3.5 w-3.5" />,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    label: __('Add to Cart', 'yayboost-sales-booster-for-woocommerce'),
  },
  click: {
    icon: <BarChart3 className="h-3.5 w-3.5" />,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    label: __('Click', 'yayboost-sales-booster-for-woocommerce'),
  },
  threshold_reached: {
    icon: <Truck className="h-3.5 w-3.5" />,
    color: 'text-warning-foreground',
    bgColor: 'bg-warning/20',
    label: __('Threshold', 'yayboost-sales-booster-for-woocommerce'),
  },
};

function formatCurrency(amount: number): string {
  const symbol = window.yayboostData?.currencySymbol || '$';
  return `${symbol}${amount.toFixed(2)}`;
}

function formatTimeAgo(dateString: string): string {
  try {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return dateString;
  }
}

function ActivityItemSkeleton() {
  return (
    <div className="flex gap-3 py-3">
      <div className="flex flex-col items-center">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="mt-2 h-full w-0.5" />
      </div>
      <div className="flex-1 space-y-2 pb-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

function ActivityItemRow({
  activity,
  isLast,
}: {
  activity: ActivityItem;
  isLast: boolean;
}) {
  const config = EVENT_CONFIG[activity.event_type] || EVENT_CONFIG.purchase;

  // Build description based on event type
  let productInfo = activity.product_name || '';
  if (activity.quantity > 1) {
    productInfo += ` x${activity.quantity}`;
  }

  const revenue =
    activity.event_type === 'purchase' && activity.revenue > 0
      ? formatCurrency(activity.revenue)
      : null;

  return (
    <div className="group flex gap-3">
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        {/* Event icon */}
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110',
            config.bgColor,
            config.color,
          )}
        >
          {config.icon}
        </div>
        {/* Connector line */}
        {!isLast && <div className="mt-1 h-full w-0.5 bg-border" />}
      </div>

      {/* Content */}
      <div className={cn('min-w-0 flex-1 pb-4', isLast && 'pb-0')}>
        {/* Event label + time */}
        <div className="flex items-center justify-between gap-2">
          <span className={cn('text-xs font-medium', config.color)}>{config.label}</span>
          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatTimeAgo(activity.created_at)}
          </span>
        </div>

        {/* Custom event message or product info */}
        {activity.event_message ? (
          <p className="mt-0.5 truncate text-sm font-medium text-foreground">
            {activity.event_message}
          </p>
        ) : (
          productInfo && (
            <p className="mt-0.5 truncate text-sm font-medium text-foreground">{productInfo}</p>
          )
        )}

        {/* Meta row: feature name + revenue */}
        <div className="mt-1 flex items-center gap-2">
          <span className="truncate text-xs text-muted-foreground">{activity.feature_name}</span>
          {revenue && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="shrink-0 text-xs font-medium text-success">{revenue}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="relative mb-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Package className="h-7 w-7 text-muted-foreground" />
        </div>
        <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
        </div>
      </div>
      <p className="text-sm font-medium text-foreground">
        {__('Waiting for activity...', 'yayboost-sales-booster-for-woocommerce')}
      </p>
      <p className="mt-1 max-w-[200px] text-xs leading-relaxed text-muted-foreground">
        {__('Events will appear here as customers interact with your features', 'yayboost-sales-booster-for-woocommerce')}
      </p>
    </div>
  );
}

export function RecentActivityFeed() {
  const { data, isLoading, error } = useQuery<ActivityFeedResponse>({
    queryKey: ['dashboard', 'activity'],
    queryFn: () => dashboardApi.getRecentActivity(10),
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

  if (error) {
    return null;
  }

  const activities = data?.activities || [];

  return (
    <div className="relative overflow-hidden rounded-xl border bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">{__('Recent Activity', 'yayboost-sales-booster-for-woocommerce')}</h3>
            <p className="text-xs text-muted-foreground">{__('Live updates', 'yayboost-sales-booster-for-woocommerce')}</p>
          </div>
        </div>

        {/* Activity count badge */}
        {activities.length > 0 && (
          <span className="flex h-6 items-center rounded-full bg-primary/10 px-2.5 text-xs font-medium text-primary">
            {activities.length} {__('events', 'yayboost-sales-booster-for-woocommerce')}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {isLoading ? (
          <div>
            <ActivityItemSkeleton />
            <ActivityItemSkeleton />
            <ActivityItemSkeleton />
          </div>
        ) : activities.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-0">
            {activities.map((activity, index) => (
              <ActivityItemRow
                key={activity.id}
                activity={activity}
                isLast={index === activities.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer with legend */}
      {!isLoading && activities.length > 0 && (
        <div className="flex items-center justify-center gap-4 border-t bg-muted/30 px-4 py-2.5">
          {Object.entries(EVENT_CONFIG).map(([key, config]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className={cn('flex h-4 w-4 items-center justify-center rounded-full', config.bgColor)}>
                <div className={cn('h-1.5 w-1.5 rounded-full', config.color.replace('text-', 'bg-'))} />
              </div>
              <span className="text-xs text-muted-foreground">{config.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RecentActivityFeed;
