/**
 * Feature Layout - Layout for individual feature pages
 */

import { useState } from 'react';
import { ArrowLeft } from '@phosphor-icons/react';
import { Link, Outlet } from 'react-router-dom';

import { cn } from '@/lib/utils';
import { useFeature } from '@/hooks/use-features';
import { Skeleton } from '@/components/ui/skeleton';

import { PageContext, PageContextType } from './useContext';

interface FeatureLayoutProps {
  featureId: string;
  children?: React.ReactNode;
}

export function FeatureLayout({ featureId, children }: FeatureLayoutProps) {
  const [pageTitle, setPageTitle] = useState<string | null>(null);
  const [pageDescription, setDescriptionPage] = useState<string | null>(null);
  const [actionElement, setActionElement] = useState<React.ReactNode | null>(null);
  const { data: feature, isLoading } = useFeature(featureId);
  // const toggleMutation = useToggleFeature();

  const pageContext: PageContextType = {
    setPageHeader: (pageTitle: string | null, pageDescription: string | null = null) => {
      setPageTitle(pageTitle);
      setDescriptionPage(pageDescription);
    },
    setActionElement
  };

  // const handleToggle = (enabled: boolean) => {
  //   toggleMutation.mutate({ id: featureId, enabled });
  // };

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
    <PageContext.Provider value={pageContext}>
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
            <h1 className="text-2xl font-semibold">{pageTitle ?? feature.name}</h1>
            <p className="text-sm text-muted-foreground">{pageDescription ?? feature.description}</p>
          </div>
        </div>

        {/* Action Element */}
        <div className="flex items-center gap-3">
          {actionElement ?? <></>}
        </div>
      </div>

      {/* Feature content */}
      <div
        className={cn('bg-card', !feature.enabled && 'opacity-60')}
      >
        {children || <Outlet />}
      </div>
    </div>
    </PageContext.Provider>
  );
}
