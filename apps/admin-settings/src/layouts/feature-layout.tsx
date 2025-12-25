/**
 * Feature Layout - Layout for individual feature pages
 */

import { SpinnerIcon } from '@phosphor-icons/react';
import { ArrowUpRightIcon, FolderLockIcon } from 'lucide-react';
import { Link, Outlet, useNavigate } from 'react-router-dom';

import { useFeature, useToggleFeature } from '@/hooks/use-features';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';

interface FeatureLayoutProps {
  featureId: string;
  children?: React.ReactNode;
}

export function FeatureLayout({ featureId, children }: FeatureLayoutProps) {
  const { data: feature, isLoading } = useFeature(featureId);
  const { isPending, mutate: toggleFeature } = useToggleFeature();
  const navigate = useNavigate();

  const handleEnableFeature = (featureId: string) => {
    toggleFeature({ id: featureId, enabled: true });
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
      {/* Feature content */}
      {feature.enabled ? (
        children || <Outlet />
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderLockIcon />
            </EmptyMedia>
            <EmptyTitle>{feature.name} is not enabled</EmptyTitle>
            <EmptyDescription>
              Please enable this feature to use it or contact support.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex gap-2">
              <Button disabled={isPending} onClick={() => handleEnableFeature(feature.id)}>
                Enable Feature {isPending && <SpinnerIcon className="size-4 animate-spin" />}
              </Button>
              <Button variant="outline" onClick={() => navigate('/features')}>
                Back to features
              </Button>
            </div>
          </EmptyContent>
          <Button variant="link" asChild className="text-muted-foreground" size="sm">
            <a href="#">
              Learn More <ArrowUpRightIcon />
            </a>
          </Button>
        </Empty>
      )}
    </div>
  );
}
