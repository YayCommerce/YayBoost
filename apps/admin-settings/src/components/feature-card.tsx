/**
 * Feature Card - Displays a single feature with toggle
 *
 * Design: Enhanced card with glow effect when enabled,
 * smooth transitions, and visual feedback on interactions.
 */

import { hasFeatureComponent } from '@/features';
import { Link } from '@tanstack/react-router';
import { __ } from '@wordpress/i18n';
import { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';

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
        return () => <Badge variant="primary-soft">{__('Coming Soon', 'yayboost-sales-booster-for-woocommerce')}</Badge>;
      case 'new':
        return () => <Badge>{__('New', 'yayboost-sales-booster-for-woocommerce')}</Badge>;
      case 'beta':
        return () => <Badge variant="outline">{__('Beta', 'yayboost-sales-booster-for-woocommerce')}</Badge>;
      default:
        return null;
    }
  }, [feature.status]);

  const isComingSoon = feature.status === 'coming_soon';

  return (
    <Card
      className={cn(
        'group relative flex flex-col justify-between overflow-hidden rounded-xl transition-all duration-300',
        // Glow effect when enabled
        feature.enabled
          ? 'border-primary/20 shadow-[0_0_20px_-5px_rgba(34,113,177,0.15)] hover:shadow-[0_0_25px_-5px_rgba(34,113,177,0.25)]'
          : 'hover:shadow-md',
        // Pending state
        toggleMutation.isPending && 'opacity-70',
      )}
    >
      {/* Subtle gradient overlay for enabled state */}
      {feature.enabled && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-transparent" />
      )}

      <CardHeader className="relative pb-3">
        {/* Top row: Icon + Title + Badge */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all duration-300',
              feature.enabled
                ? 'bg-primary/10 text-primary group-hover:bg-primary/15'
                : 'bg-muted text-muted-foreground group-hover:bg-muted/80',
            )}
          >
            <Icon weight="duotone" className="h-5 w-5" />
          </div>
          <div className="flex flex-1 items-center justify-between gap-2">
            <CardTitle className="text-base font-medium">{feature.name}</CardTitle>
            <div className="flex gap-1.5">
              {FeatureStatusBadge && <FeatureStatusBadge />}
            </div>
          </div>
        </div>

        {/* Description */}
        <CardDescription
          className="mt-2 line-clamp-2 text-sm font-normal"
          dangerouslySetInnerHTML={{ __html: feature.description }}
        />
      </CardHeader>

      {/* Bottom row: Settings Button + Toggle Switch */}
      <CardContent className="relative flex items-center justify-between pt-0">
        {isComingSoon ? (
          <span className="text-sm text-muted-foreground">{__('Stay tuned!', 'yayboost-sales-booster-for-woocommerce')}</span>
        ) : hasComponent ? (
          feature.enabled ? (
            <Link
              to="/features/$featureId"
              params={{ featureId: feature.id }}
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer gap-1 rounded-lg transition-all duration-200 hover:border-primary/30 hover:bg-primary/[0.02]"
              >
                {__('Settings', 'yayboost-sales-booster-for-woocommerce')}
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
              </Button>
            </Link>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg opacity-50"
              disabled
            >
              {__('Settings', 'yayboost-sales-booster-for-woocommerce')}
            </Button>
          )
        ) : (
          <Button variant="primary" size="sm" className="cursor-pointer rounded-lg">
            {__('Buy Now', 'yayboost-sales-booster-for-woocommerce')}
          </Button>
        )}

        {/* Enhanced toggle with scale animation */}
        <div
          className={cn(
            'transition-transform duration-200',
            toggleMutation.isPending && 'scale-95',
          )}
        >
          <Switch
            checked={feature.enabled}
            onCheckedChange={handleToggle}
            disabled={toggleMutation.isPending || isComingSoon}
            className="cursor-pointer"
          />
        </div>
      </CardContent>
    </Card>
  );
}
