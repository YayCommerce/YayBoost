/**
 * Feature Card - Displays a single feature with toggle
 */

import { hasFeatureComponent } from '@/features';
import * as PhosphorIcons from '@phosphor-icons/react';
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

  const getStatusBadge = () => {
    if (feature.enabled) {
      return <Badge variant="success">Active</Badge>;
    }
    return <Badge variant="muted">Inactive</Badge>;
  };

  return (
    <Card
      className={cn(
        'group rounded-[10px] transition-all hover:shadow-md',
        !feature.enabled && 'opacity-60',
      )}
    >
      <CardHeader className="pb-3">
        {/* Top row: Icon + Title + Badge */}
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
              feature.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
            )}
          >
            <Icon weight="duotone" className="h-5 w-5" />
          </div>
          <div className="flex flex-1 items-start justify-between gap-2">
            <CardTitle className="group-hover:text-primary text-base font-medium">
              {feature.name}
            </CardTitle>
            {getStatusBadge()}
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
          <Link to={`/features/${feature.id}`} onClick={(e) => e.stopPropagation()}>
            <Button variant="outline" size="sm" className="rounded-[8px]">
              Settings
            </Button>
          </Link>
        ) : (
          <Button variant="primary" size="sm">
            Buy Now
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
