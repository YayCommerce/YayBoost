/**
 * Feature Layout - Layout for individual feature pages
 */

import { Link, Outlet } from 'react-router-dom';

import { cn } from '@/lib/utils';
import { useFeature } from '@/hooks/use-features';
import { Skeleton } from '@/components/ui/skeleton';

interface FeatureLayoutProps {
  featureId: string;
  children?: React.ReactNode;
}

export function FeatureLayout({ featureId, children }: FeatureLayoutProps) {
  const { data: feature, isLoading } = useFeature(featureId);

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
      {/* Feature content */}
      <div
        className={cn('bg-card', !feature.enabled && 'opacity-60')}
      >
        {children || <Outlet />}
      </div>
    </div>
  );
}
