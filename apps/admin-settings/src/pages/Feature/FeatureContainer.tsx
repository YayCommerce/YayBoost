/**
 * Feature Container - Displays features list with tabs, search, and feature cards
 */

import { useState } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import * as PhosphorIcons from '@phosphor-icons/react';

import { Feature, FeatureCategory } from '@/lib/api';
import { useFeaturesByCategory } from '@/hooks/use-features';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Input, InputPrefix } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FeatureCard } from '@/components/feature-card';

// Get Phosphor icon by name
function getIcon(iconName: string) {
  const pascalCase = iconName
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
  const Icon = (PhosphorIcons as unknown as Record<string, PhosphorIcons.Icon>)[pascalCase];
  return Icon || PhosphorIcons.Lightning;
}

// Header Component
function FeatureHeader() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Features</h1>
      <p className="text-muted-foreground mt-1">
        Connect your favorite tools and enhance your workflow
      </p>
    </div>
  );
}

export default function FeatureContainer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Fetch features grouped by category from API
  const { data: grouped, categories, isLoading, error } = useFeaturesByCategory();

  // Build tabs dynamically from categories
  const tabs = [
    { value: 'all', label: 'All Features', icon: null },
    ...(categories || []).map((category: FeatureCategory) => ({
      value: category.id,
      label: category.name,
      icon: category.icon,
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
      <FeatureHeader />

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
            <EmptyTitle>Failed to load features</EmptyTitle>
            <EmptyDescription>{error.message}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {/* Empty state */}
      {!isLoading && !error && !hasFeatures && (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No features available</EmptyTitle>
            <EmptyDescription>Features will appear here once configured.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {/* Main content */}
      {!isLoading && !error && hasFeatures && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <TabsList>
              {tabs.map((tab) => {
                const Icon = tab.icon ? getIcon(tab.icon) : null;
                return (
                  <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
                    {Icon && <Icon className="h-4 w-4" />}
                    {tab.label}
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
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Content Section */}
          {tabs.map((tab) => {
            const filteredFeatures = getFilteredFeatures(tab.value);
            return (
              <TabsContent key={tab.value} value={tab.value} className="mt-6">
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredFeatures.map((feature) => (
                    <FeatureCard key={feature.id} feature={feature} />
                  ))}
                </div>
                {filteredFeatures.length === 0 && (
                  <p className="text-muted-foreground py-8 text-center">No features found</p>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}
