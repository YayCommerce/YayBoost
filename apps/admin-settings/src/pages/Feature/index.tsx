/**
 * Feature Page - Wrapper that loads the appropriate feature component
 */

import { Suspense } from 'react';
import { getFeatureComponent, hasFeatureComponent } from '@/features';
import { FeatureLayout } from '@/layouts/feature-layout';
import { __ } from '@wordpress/i18n';
import { useParams } from '@tanstack/react-router';

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
        <CardTitle>{__('Feature Settings', 'yayboost')}</CardTitle>
        <CardDescription>
          {__('Configure this feature&apos;s behavior', 'yayboost')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          {__(
            'This feature doesn&apos;t have a custom settings page yet. Use the toggle in the header toenable or disable it.',
            'yayboost',
          )}
        </p>
      </CardContent>
    </Card>
  );
}

export default function FeaturePage() {
  const { featureId } = useParams({ strict: false });

  if (!featureId) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">{__('Feature not specified', 'yayboost')}</p>
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
