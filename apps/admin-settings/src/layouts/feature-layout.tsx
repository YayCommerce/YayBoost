/**
 * Feature Layout - Layout for individual feature pages
 */

import { ArrowLeft } from '@phosphor-icons/react';
import { Link, Outlet } from 'react-router-dom';

import { cn } from '@/lib/utils';
import { useFeature, useToggleFeature } from '@/hooks/use-features';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';

interface FeatureLayoutProps {
  featureId: string;
  children?: React.ReactNode;
}

export function FeatureLayout({ featureId, children }: FeatureLayoutProps) {
  const { data: feature, isLoading } = useFeature(featureId, true);
  const toggleMutation = useToggleFeature();

  const handleToggle = (enabled: boolean) => {
    toggleMutation.mutate({ id: featureId, enabled });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!feature) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Feature not found</p>
        <Link to="/" className="text-primary mt-2 inline-block hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Feature header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/features"
            className="hover:bg-muted flex h-8 w-8 items-center justify-center rounded-md border"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">{feature.name}</h1>
            <p className="text-muted-foreground text-sm">{feature.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-sm">
            {feature.enabled ? 'Enabled' : 'Disabled'}
          </span>
          <Switch
            checked={feature.enabled}
            onCheckedChange={handleToggle}
            disabled={toggleMutation.isPending}
          />
        </div>
      </div>

      {/* Feature content */}
      <div className={cn('bg-card rounded-lg border p-6')}>{children || <Outlet />}</div>
    </div>
  );
}
