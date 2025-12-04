/**
 * Dashboard Page - Lists all features grouped by category
 */

import * as PhosphorIcons from '@phosphor-icons/react';

import { useFeaturesByCategory } from '@/hooks/use-features';
import { FeatureCategory } from '@/lib/api';
import { FeatureCard } from '@/components/feature-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Get Phosphor icon by name
function getIcon(iconName: string) {
  const pascalCase = iconName
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
  const Icon = (PhosphorIcons as Record<string, PhosphorIcons.Icon>)[pascalCase];
  return Icon || PhosphorIcons.Lightning;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-full max-w-md" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: grouped, categories, isLoading, error } = useFeaturesByCategory();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load features</p>
        <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
      </div>
    );
  }

  if (!grouped || Object.keys(grouped).length === 0) {
    return (
      <div className="text-center py-12">
        <PhosphorIcons.Package weight="duotone" className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No features available</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Features will appear here once configured.
        </p>
      </div>
    );
  }

  // If we have categories, use tabs. Otherwise just show all features
  if (categories && categories.length > 1) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Features</h1>
          <p className="text-muted-foreground">Manage your YayBoost features</p>
        </div>

        <Tabs defaultValue={categories[0]?.id || 'all'}>
          <TabsList>
            {categories.map((category: FeatureCategory) => {
              const Icon = getIcon(category.icon);
              return (
                <TabsTrigger key={category.id} value={category.id} className="gap-2">
                  <Icon className="h-4 w-4" />
                  {category.name}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {categories.map((category: FeatureCategory) => (
            <TabsContent key={category.id} value={category.id} className="mt-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {grouped[category.id]?.map((feature) => (
                  <FeatureCard key={feature.id} feature={feature} />
                ))}
              </div>
              {(!grouped[category.id] || grouped[category.id].length === 0) && (
                <p className="text-center py-8 text-muted-foreground">
                  No features in this category yet.
                </p>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    );
  }

  // Simple grid layout when no categories
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Features</h1>
        <p className="text-muted-foreground">Manage your YayBoost features</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Object.values(grouped)
          .flat()
          .map((feature) => (
            <FeatureCard key={feature.id} feature={feature} />
          ))}
      </div>
    </div>
  );
}
