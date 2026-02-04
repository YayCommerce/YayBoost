/**
 * Dashboard Stats Component
 *
 * Displays analytics overview on the main dashboard.
 *
 * Design: Modern stat cards with gradient accents and visual hierarchy
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { __ } from '@wordpress/i18n';
import {
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  DollarSign,
  Eye,
  ShoppingCart,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

import { analyticsApi, AnalyticsDashboardResponse } from '@/lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const PERIOD_OPTIONS = [
  { value: '7d', label: __('Last 7 days', 'yayboost') },
  { value: '30d', label: __('Last 30 days', 'yayboost') },
  { value: '90d', label: __('Last 90 days', 'yayboost') },
];

// Feature name mapping
const FEATURE_NAMES: Record<string, string> = {
  fbt: __('Frequently Bought Together', 'yayboost'),
  free_shipping_bar: __('Free Shipping Bar', 'yayboost'),
  stock_scarcity: __('Stock Scarcity', 'yayboost'),
  next_order_coupon: __('Next Order Coupon', 'yayboost'),
  smart_recommendations: __('Smart Recommendations', 'yayboost'),
  order_bump: __('Order Bump', 'yayboost'),
};

// Stat card configuration
const STAT_CONFIG = {
  revenue: {
    icon: DollarSign,
    gradient: 'from-success/20 to-success/5',
    iconBg: 'bg-success/10',
    iconColor: 'text-success',
    valueColor: 'text-success',
  },
  impressions: {
    icon: Eye,
    gradient: 'from-primary/20 to-primary/5',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    valueColor: 'text-foreground',
  },
  carts: {
    icon: ShoppingCart,
    gradient: 'from-warning/20 to-warning/5',
    iconBg: 'bg-warning/10',
    iconColor: 'text-warning-foreground',
    valueColor: 'text-foreground',
  },
  conversion: {
    icon: TrendingUp,
    gradient: 'from-primary/20 to-primary/5',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    valueColor: 'text-foreground',
  },
};

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  config: (typeof STAT_CONFIG)[keyof typeof STAT_CONFIG];
}

function StatCard({ title, value, description, config }: StatCardProps) {
  const Icon = config.icon;

  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md">
      {/* Gradient background */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-200',
          // 'group-hover:opacity-100',
          config.gradient,
        )}
      />

      <div className="relative">
        {/* Header: Icon + Title */}
        <div className="flex items-center justify-between">
          <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', config.iconBg)}>
            <Icon className={cn('h-4 w-4', config.iconColor)} />
          </div>
          {/* <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all duration-200 group-hover:opacity-100" /> */}
        </div>

        {/* Value */}
        <div className="mt-4">
          <p className={cn('text-2xl font-bold tracking-tight', config.valueColor)}>{value}</p>
          <p className="mt-0.5 text-sm font-medium text-foreground">{title}</p>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-4 w-4" />
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="relative mb-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <BarChart3 className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
      </div>
      <p className="text-base font-medium text-foreground">
        {__('No analytics data yet', 'yayboost')}
      </p>
      <p className="mt-1 max-w-[280px] text-sm leading-relaxed text-muted-foreground">
        {__('Enable features and wait for customer interactions to see stats here.', 'yayboost')}
      </p>
    </div>
  );
}

export function DashboardStats() {
  const [period, setPeriod] = useState('7d');

  const { data, isLoading, error } = useQuery<AnalyticsDashboardResponse>({
    queryKey: ['analytics', 'dashboard', period],
    queryFn: () => analyticsApi.getDashboard(period),
  });

  const formatCurrency = (value: number) => {
    const symbol = window.yayboostData?.currencySymbol || '$';
    return `${symbol}${value.toFixed(2)}`;
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  };

  // Check if there's any data
  const hasData =
    data && (data.totals.impressions > 0 || data.totals.purchases > 0 || data.totals.revenue > 0);

  // Get active features with data
  const activeFeatures = data?.features
    ? Object.entries(data.features).filter(
        ([, stats]) => stats.impressions > 0 || stats.purchases > 0,
      )
    : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-accent shadow-sm">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              {__('Analytics Overview', 'yayboost')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {__('Track your boost features performance', 'yayboost')}
            </p>
          </div>
        </div>

        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-full cursor-pointer bg-card sm:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value} className="cursor-pointer">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <div className="rounded-xl border bg-card p-6 text-center shadow-sm">
          <p className="text-muted-foreground">
            {__('Failed to load analytics data', 'yayboost')}
          </p>
        </div>
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : !hasData ? (
        <div className="rounded-xl border bg-card shadow-sm">
          <EmptyState />
        </div>
      ) : (
        <>
          {/* Overview Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title={__('Total Revenue', 'yayboost')}
              value={formatCurrency(data.totals.revenue)}
              config={STAT_CONFIG.revenue}
              description={__('From all boost features', 'yayboost')}
            />
            <StatCard
              title={__('Impressions', 'yayboost')}
              value={formatNumber(data.totals.impressions)}
              config={STAT_CONFIG.impressions}
              description={__('Feature views', 'yayboost')}
            />
            <StatCard
              title={__('Add to Carts', 'yayboost')}
              value={formatNumber(data.totals.add_to_carts)}
              config={STAT_CONFIG.carts}
              description={__('Products added via features', 'yayboost')}
            />
            <StatCard
              title={__('Conversion Rate', 'yayboost')}
              value={`${data.conversion_rate}%`}
              config={STAT_CONFIG.conversion}
              description={__('Impressions to purchases', 'yayboost')}
            />
          </div>

          {/* Per-Feature Stats */}
          {activeFeatures.length > 0 && (
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              {/* Header */}
              <div className="flex items-center justify-between border-b px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">
                      {__('Feature Performance', 'yayboost')}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {__('Breakdown by individual features', 'yayboost')}
                    </p>
                  </div>
                </div>
                <span className="flex h-6 items-center rounded-full bg-muted px-2.5 text-xs font-medium text-muted-foreground">
                  {activeFeatures.length} {__('active', 'yayboost')}
                </span>
              </div>

              {/* Feature list */}
              <div className="divide-y">
                {activeFeatures.map(([featureId, stats]) => {
                  // Calculate conversion rate for this feature
                  const featureConversion =
                    stats.impressions > 0
                      ? ((stats.purchases / stats.impressions) * 100).toFixed(1)
                      : '0';

                  return (
                    <div
                      key={featureId}
                      className="group flex items-center gap-4 px-5 py-4 transition-colors duration-200 hover:bg-muted/30"
                    >
                      {/* Feature info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-medium">
                            {FEATURE_NAMES[featureId] || featureId}
                          </p>
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" />
                        </div>
                        <div className="mt-1 flex items-center gap-3">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Eye className="h-3 w-3" />
                            {formatNumber(stats.impressions)}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <ShoppingCart className="h-3 w-3" />
                            {stats.purchases}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {featureConversion}% {__('conv.', 'yayboost')}
                          </span>
                        </div>
                      </div>

                      {/* Revenue */}
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-success">
                          {formatCurrency(stats.revenue)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {__('revenue', 'yayboost')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default DashboardStats;
