/**
 * Feature Layout - Layout for individual feature pages
 */

import { ArrowLeft } from '@phosphor-icons/react';
import { Link, Outlet } from 'react-router-dom';

import { useFeature, useToggleFeature } from '@/hooks/use-features';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';

interface FeatureLayoutProps {
  featureId: string;
  children?: React.ReactNode;
}

export function FeatureLayout({ featureId, children }: FeatureLayoutProps) {
  const { data: feature, isLoading } = useFeature(featureId);
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
      <div className="text-center py-12">
        <p className="text-muted-foreground">Feature not found</p>
        <Link to="/" className="text-primary hover:underline mt-2 inline-block">
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
            className="flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">{feature.name}</h1>
            <p className="text-sm text-muted-foreground">{feature.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
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
      <div
        className={cn('rounded-lg border bg-card p-6', !feature.enabled && 'opacity-60')}
      >
        {children || <Outlet />}
      </div>
    </div>
  );
}
