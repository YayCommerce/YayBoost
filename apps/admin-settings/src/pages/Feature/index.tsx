/**
 * Feature Page - Wrapper that loads the appropriate feature component
 */

import { Suspense } from 'react';
import { getFeatureComponent, hasFeatureComponent } from '@/features';
import { FeatureLayout } from '@/layouts/feature-layout';
import { useParams } from 'react-router-dom';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function FeatureLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function DefaultFeatureContent({ featureId }: { featureId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Feature Settings</CardTitle>
        <CardDescription>Configure this feature&apos;s behavior</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          This feature doesn&apos;t have a custom settings page yet. Use the toggle in the header to
          enable or disable it.
        </p>
      </CardContent>
    </Card>
  );
}

export default function FeaturePage() {
  const { featureId } = useParams<{ featureId: string }>();

  if (!featureId) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Feature not specified</p>
      </div>
    );
  }

  // Check if feature has a custom component
  const FeatureComponent = getFeatureComponent(featureId);

  return (
    <FeatureLayout featureId={featureId}>
      {FeatureComponent ? (
        <Suspense fallback={<FeatureLoading />}>
          <FeatureComponent featureId={featureId} />
        </Suspense>
      ) : (
        <DefaultFeatureContent featureId={featureId} />
      )}
    </FeatureLayout>
  );
}
