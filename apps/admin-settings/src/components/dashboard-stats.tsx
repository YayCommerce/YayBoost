/**
 * Dashboard Stats Component
 *
 * Displays analytics overview on the main dashboard.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { __ } from '@wordpress/i18n';
import { TrendingUp, ShoppingCart, Eye, MousePointer, DollarSign } from 'lucide-react';

import { analyticsApi, AnalyticsDashboardResponse } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
}

function StatCard({ title, value, icon, description }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-muted-foreground text-xs">{description}</p>}
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20" />
        <Skeleton className="mt-1 h-3 w-32" />
      </CardContent>
    </Card>
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
    return value.toString();
  };

  // Check if there's any data
  const hasData = data && (
    data.totals.impressions > 0 ||
    data.totals.purchases > 0 ||
    data.totals.revenue > 0
  );

  // Get active features with data
  const activeFeatures = data?.features
    ? Object.entries(data.features).filter(
        ([, stats]) => stats.impressions > 0 || stats.purchases > 0,
      )
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{__('Analytics Overview', 'yayboost')}</h2>
          <p className="text-muted-foreground text-sm">
            {__('Track your boost features performance', 'yayboost')}
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[150px] bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-muted-foreground">{__('Failed to load analytics data', 'yayboost')}</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : !hasData ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Eye className="text-muted-foreground mx-auto mb-3 h-12 w-12 opacity-50" />
            <h3 className="mb-1 font-medium">{__('No analytics data yet', 'yayboost')}</h3>
            <p className="text-muted-foreground text-sm">
              {__('Enable features and wait for customer interactions to see stats here.', 'yayboost')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Overview Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title={__('Total Revenue', 'yayboost')}
              value={formatCurrency(data.totals.revenue)}
              icon={<DollarSign className="h-4 w-4" />}
              description={__('From all boost features', 'yayboost')}
            />
            <StatCard
              title={__('Impressions', 'yayboost')}
              value={formatNumber(data.totals.impressions)}
              icon={<Eye className="h-4 w-4" />}
              description={__('Feature views', 'yayboost')}
            />
            <StatCard
              title={__('Add to Carts', 'yayboost')}
              value={formatNumber(data.totals.add_to_carts)}
              icon={<ShoppingCart className="h-4 w-4" />}
              description={__('Products added via features', 'yayboost')}
            />
            <StatCard
              title={__('Conversion Rate', 'yayboost')}
              value={`${data.conversion_rate}%`}
              icon={<TrendingUp className="h-4 w-4" />}
              description={__('Impressions to purchases', 'yayboost')}
            />
          </div>

          {/* Per-Feature Stats */}
          {activeFeatures.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{__('Feature Performance', 'yayboost')}</CardTitle>
                <CardDescription>
                  {__('Breakdown by individual features', 'yayboost')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeFeatures.map(([featureId, stats]) => (
                    <div
                      key={featureId}
                      className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium">
                          {FEATURE_NAMES[featureId] || featureId}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {formatNumber(stats.impressions)} {__('impressions', 'yayboost')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(stats.revenue)}</p>
                        <p className="text-muted-foreground text-sm">
                          {stats.purchases} {__('purchases', 'yayboost')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export default DashboardStats;
