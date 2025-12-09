/**
 * Feature Card - Displays a single feature with toggle
 */

import { useMemo } from 'react';
import { hasFeatureComponent } from '@/features';
import * as PhosphorIcons from '@phosphor-icons/react';
import { __ } from '@wordpress/i18n';
import { Link } from 'react-router-dom';

import { Feature } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useToggleFeature } from '@/hooks/use-features';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

interface FeatureCardProps {
  feature: Feature;
}

// TODO: change this to use PHP declaration. SVG get from phosphor website
// Get Phosphor icon by name
function getIcon(iconName: string) {
  const pascalCase = iconName
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
  const Icon = (PhosphorIcons as unknown as Record<string, PhosphorIcons.Icon>)[pascalCase];
  return Icon || PhosphorIcons.Lightning;
}

export function FeatureCard({ feature }: FeatureCardProps) {
  const toggleMutation = useToggleFeature();
  const hasComponent = hasFeatureComponent(feature.id);
  const Icon = getIcon(feature.icon);

  const handleToggle = (checked: boolean) => {
    toggleMutation.mutate({ id: feature.id, enabled: checked });
  };

  const StatusBadge = useMemo(() => {
    if (feature.enabled) {
      return () => <Badge variant="success">{__('Active', 'yayboost')}</Badge>;
    }
    return () => <Badge variant="muted">{__('Inactive', 'yayboost')}</Badge>;
  }, [feature.enabled]);

  return (
    <Card className="group rounded-[10px] transition-all hover:shadow-md">
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
            <StatusBadge />
          </div>
        </div>
        {/* Description */}
        <CardDescription className="mt-2 line-clamp-2 text-sm font-normal">
          {feature.description}
        </CardDescription>
      </CardHeader>
      {/* Bottom row: Settings Button + Toggle Switch */}
      <CardContent className="flex items-center justify-between pt-0">
        {hasComponent ? (
          <Link
            to={feature.enabled ? `/features/${feature.id}` : '#'}
            onClick={(e) => e.stopPropagation()}
            className={cn('text-foreground cursor-auto', !feature.enabled && 'opacity-50')}
          >
            <Button variant="outline" size="sm" className="rounded-[8px]">
              {__('Settings', 'yayboost')}
            </Button>
          </Link>
        ) : (
          <Button variant="primary" size="sm">
            {__('Buy Now', 'yayboost')}
          </Button>
        )}
        <Switch
          checked={feature.enabled}
          onCheckedChange={handleToggle}
          disabled={toggleMutation.isPending}
        />
      </CardContent>
    </Card>
  );
}
