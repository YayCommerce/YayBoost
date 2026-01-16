/**
 * Feature Card - Displays a single feature with toggle
 */

import { hasFeatureComponent } from '@/features';
import { Link } from '@tanstack/react-router';
import { __ } from '@wordpress/i18n';
import { useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToggleFeature } from '@/hooks/use-features';
import { Feature } from '@/lib/api';
import { getIcon } from '@/lib/feature-icons';
import { cn } from '@/lib/utils';

interface FeatureCardProps {
  feature: Feature;
}

export function FeatureCard({ feature }: FeatureCardProps) {
  const toggleMutation = useToggleFeature();
  const hasComponent = hasFeatureComponent(feature.id);
  const Icon = getIcon(feature.icon);

  const handleToggle = (checked: boolean) => {
    toggleMutation.mutate({ id: feature.id, enabled: checked });
  };

  // Feature status badge (coming_soon, new, beta)
  const FeatureStatusBadge = useMemo(() => {
    switch (feature.status) {
      case 'coming_soon':
        return () => <Badge variant="primary-soft">{__('Coming Soon', 'yayboost')}</Badge>;
      case 'new':
        return () => <Badge>{__('New', 'yayboost')}</Badge>;
      case 'beta':
        return () => <Badge variant="outline">{__('Beta', 'yayboost')}</Badge>;
      default:
        return null;
    }
  }, [feature.status]);

  // Enabled/disabled status badge
  const EnabledBadge = useMemo(() => {
    // Don't show enabled badge for coming_soon features
    if (feature.status === 'coming_soon') return null;
    if (feature.enabled) {
      return () => <Badge variant="success">{__('Active', 'yayboost')}</Badge>;
    }
    return () => <Badge variant="muted">{__('Inactive', 'yayboost')}</Badge>;
  }, [feature.enabled, feature.status]);

  const isComingSoon = feature.status === 'coming_soon';

  return (
    <Card className="group rounded-[10px] transition-all hover:shadow-md justify-between">
      <CardHeader className="pb-3">
        {/* Top row: Icon + Title + Badge */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
              feature.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
            )}
          >
            <Icon weight="duotone" className="h-5 w-5" />
          </div>
          <div className="flex flex-1 items-center justify-between gap-2">
            <CardTitle className="text-base font-medium">{feature.name}</CardTitle>
            <div className="flex gap-1.5">
              {FeatureStatusBadge && <FeatureStatusBadge />}
              {EnabledBadge && <EnabledBadge />}
            </div>
          </div>
        </div>
        {/* Description */}
        <CardDescription className="mt-2 line-clamp-2 text-sm font-normal">
          {feature.description}
        </CardDescription>
      </CardHeader>
      {/* Bottom row: Settings Button + Toggle Switch */}
      <CardContent className="flex items-center justify-between pt-0">
        {isComingSoon ? (
          <span className="text-sm text-muted-foreground">{__('Stay tuned!', 'yayboost')}</span>
        ) : hasComponent ? (
          feature.enabled ? (
            <Link
              to="/features/$featureId"
              params={{ featureId: feature.id }}
              onClick={(e) => e.stopPropagation()}
              className="text-foreground cursor-auto"
            >
              <Button variant="outline" size="sm" className="rounded-[8px]">
                {__('Settings', 'yayboost')}
              </Button>
            </Link>
          ) : (
            <Button variant="outline" size="sm" className="rounded-[8px] opacity-50" disabled>
              {__('Settings', 'yayboost')}
            </Button>
          )
        ) : (
          <Button variant="primary" size="sm">
            {__('Buy Now', 'yayboost')}
          </Button>
        )}
        <Switch
          checked={feature.enabled}
          onCheckedChange={handleToggle}
          disabled={toggleMutation.isPending || isComingSoon}
        />
      </CardContent>
    </Card>
  );
}
