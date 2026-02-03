/**
 * Feature Container - Displays features list with tabs, search, and feature cards
 *
 * Design: Enhanced with category counts, better visual hierarchy,
 * and improved search experience.
 */

import { useMemo, useState } from 'react';
import { __ } from '@wordpress/i18n';
import { Sparkles } from 'lucide-react';

import { FeatureCard } from '@/components/feature-card';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Input, InputPrefix } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFeaturesByCategory } from '@/hooks/use-features';
import { Feature, FeatureCategory } from '@/lib/api';
import { getIcon, MagnifyingGlass } from '@/lib/feature-icons';
import { cn } from '@/lib/utils';

// Header Component with stats
function FeatureHeader({ activeCount, totalCount }: { activeCount: number; totalCount: number }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{__('Features', 'yayboost')}</h1>
        <p className="mt-1 text-muted-foreground">
          {__('Boost your sales with powerful conversion tools', 'yayboost')}
        </p>
      </div>

      {/* Stats pills */}
      {totalCount > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-success" />
            <span className="text-sm font-medium text-success">
              {activeCount} {__('Active', 'yayboost')}
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5">
            <span className="text-sm text-muted-foreground">
              {totalCount} {__('Total', 'yayboost')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FeatureContainer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Fetch features grouped by category from API
  const { data: grouped, categories, isLoading, error } = useFeaturesByCategory();

  // Calculate stats
  const { allFeatures, activeCount, totalCount, categoryCounts } = useMemo(() => {
    if (!grouped || Object.keys(grouped).length === 0) {
      return { allFeatures: [], activeCount: 0, totalCount: 0, categoryCounts: {} };
    }

    const all = Object.values(grouped).flat();
    const active = all.filter((f) => f.enabled).length;

    // Count features per category
    const counts: Record<string, { total: number; active: number }> = {};
    Object.entries(grouped).forEach(([categoryId, features]) => {
      counts[categoryId] = {
        total: features.length,
        active: features.filter((f) => f.enabled).length,
      };
    });

    return {
      allFeatures: all,
      activeCount: active,
      totalCount: all.length,
      categoryCounts: counts,
    };
  }, [grouped]);

  // Build tabs dynamically from categories
  const tabs = [
    { value: 'all', label: __('All', 'yayboost'), icon: null, count: totalCount },
    ...(categories || []).map((category: FeatureCategory) => ({
      value: category.id,
      label: category.name,
      icon: category.icon,
      count: categoryCounts[category.id]?.total || 0,
    })),
  ];

  // Filter features based on category and search
  const getFilteredFeatures = (categoryId: string) => {
    if (!grouped || Object.keys(grouped).length === 0) {
      return [];
    }

    let filteredFeatures: Feature[] = [];

    if (categoryId === 'all') {
      // Flatten all features from all categories
      filteredFeatures = Object.values(grouped).flat();
    } else {
      // Get features for specific category
      filteredFeatures = grouped[categoryId] || [];
    }

    filteredFeatures.sort((a, b) => a.priority - b.priority);

    // Apply search filter
    if (!searchQuery.trim()) {
      return filteredFeatures;
    }
    const query = searchQuery.toLowerCase();
    return filteredFeatures.filter(
      (f) => f.name.toLowerCase().includes(query) || f.description.toLowerCase().includes(query),
    );
  };

  // Check if there are any features
  const hasFeatures = grouped && Object.keys(grouped).length > 0;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <FeatureHeader activeCount={activeCount} totalCount={totalCount} />

      {/* Loading state */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{__('Failed to load features', 'yayboost')}</EmptyTitle>
            <EmptyDescription>{error.message}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {/* Empty state */}
      {!isLoading && !error && !hasFeatures && (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{__('No features available', 'yayboost')}</EmptyTitle>
            <EmptyDescription>
              {__('Features will appear here once configured.', 'yayboost')}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {/* Main content */}
      {!isLoading && !error && hasFeatures && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <TabsList className="h-auto flex-wrap gap-1 p-1">
              {tabs.map((tab) => {
                const Icon = tab.icon ? getIcon(tab.icon) : null;
                const isActive = activeTab === tab.value;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className={cn(
                      'gap-2 rounded-lg px-3 py-2 transition-all duration-200',
                      isActive && 'shadow-sm',
                    )}
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    {tab.label}
                    {/* Count badge */}
                    <span
                      className={cn(
                        'ml-1 rounded-full px-1.5 py-0.5 text-xs tabular-nums transition-colors bg-muted-foreground/10 text-muted-foreground'
                      )}
                    >
                      {tab.count}
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* Search Bar */}
            <div className="relative w-full max-w-sm">
              <InputPrefix>
                <MagnifyingGlass className="size-4" />
              </InputPrefix>
              <Input
                type="search"
                placeholder={__('Search features...', 'yayboost')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-card pl-9"
              />
            </div>
          </div>

          {/* Content Section */}
          {tabs.map((tab) => {
            const filteredFeatures = getFilteredFeatures(tab.value);
            return (
              <TabsContent key={tab.value} value={tab.value} className="mt-6">
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredFeatures.map((feature) => (
                    <FeatureCard key={feature.id} feature={feature} />
                  ))}
                </div>
                {filteredFeatures.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <Sparkles className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {__('No features found', 'yayboost')}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {searchQuery
                        ? __('Try adjusting your search', 'yayboost')
                        : __('Features will appear here', 'yayboost')}
                    </p>
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}
