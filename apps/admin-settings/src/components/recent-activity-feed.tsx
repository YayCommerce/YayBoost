/**
 * Recent Activity Feed Component
 *
 * Displays recent significant events (purchases, add to cart, threshold reached)
 * in a timeline-style feed for the dashboard.
 */

import { useQuery } from '@tanstack/react-query';
import { __ } from '@wordpress/i18n';
import { formatDistanceToNow } from 'date-fns';
import {
  Activity,
  ShoppingCart,
  ShoppingBag,
  Truck,
  Package,
} from 'lucide-react';

import { dashboardApi, ActivityFeedResponse, ActivityItem } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Event type icon and color mapping
const EVENT_CONFIG: Record<
  string,
  { icon: React.ReactNode; color: string; bgColor: string }
> = {
  purchase: {
    icon: <ShoppingBag className="h-4 w-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  add_to_cart: {
    icon: <ShoppingCart className="h-4 w-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  threshold_reached: {
    icon: <Truck className="h-4 w-4" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
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
    <div className="flex items-start gap-3 py-3">
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

function ActivityItemRow({ activity }: { activity: ActivityItem }) {
  const config = EVENT_CONFIG[activity.event_type] || EVENT_CONFIG.purchase;

  // Build description based on event type
  let description = activity.event_label;
  if (activity.product_name) {
    description = `${activity.event_label}: ${activity.product_name}`;
  }
  if (activity.event_type === 'purchase' && activity.revenue > 0) {
    description += ` (${formatCurrency(activity.revenue)})`;
  }
  if (activity.quantity > 1) {
    description += ` x${activity.quantity}`;
  }

  return (
    <div className="flex items-start gap-3 py-3">
      {/* Event icon */}
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${config.bgColor} ${config.color}`}
      >
        {config.icon}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{description}</p>
        <p className="text-muted-foreground text-xs">{activity.feature_name}</p>
      </div>

      {/* Time */}
      <span className="text-muted-foreground flex-shrink-0 text-xs">
        {formatTimeAgo(activity.created_at)}
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="bg-muted mb-3 flex h-12 w-12 items-center justify-center rounded-full">
        <Package className="text-muted-foreground h-6 w-6" />
      </div>
      <p className="text-muted-foreground text-sm">
        {__('Waiting for first customer interaction...', 'yayboost')}
      </p>
      <p className="text-muted-foreground mt-1 text-xs">
        {__('Activity will appear here as customers use your features', 'yayboost')}
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Activity className="text-muted-foreground h-5 w-5" />
          <CardTitle className="text-base">
            {__('Recent Activity', 'yayboost')}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="divide-border divide-y">
            <ActivityItemSkeleton />
            <ActivityItemSkeleton />
            <ActivityItemSkeleton />
            <ActivityItemSkeleton />
            <ActivityItemSkeleton />
          </div>
        ) : activities.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="divide-border divide-y">
            {activities.map((activity) => (
              <ActivityItemRow key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default RecentActivityFeed;
