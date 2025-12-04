/**
 * Feature Card - Displays a single feature with toggle
 */

import * as PhosphorIcons from '@phosphor-icons/react';
import { Link } from 'react-router-dom';

import { useToggleFeature } from '@/hooks/use-features';
import { Feature } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

interface FeatureCardProps {
  feature: Feature;
}

// Get Phosphor icon by name
function getIcon(iconName: string) {
  // Convert snake_case or kebab-case to PascalCase
  const pascalCase = iconName
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');

  // Try to get the icon from Phosphor
  const Icon = (PhosphorIcons as Record<string, PhosphorIcons.Icon>)[pascalCase];
  return Icon || PhosphorIcons.Lightning;
}

export function FeatureCard({ feature }: FeatureCardProps) {
  const toggleMutation = useToggleFeature();
  const Icon = getIcon(feature.icon);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleMutation.mutate({ id: feature.id, enabled: !feature.enabled });
  };

  return (
    <Link to={`/features/${feature.id}`}>
      <Card
        className={cn(
          'group cursor-pointer transition-all hover:shadow-md',
          !feature.enabled && 'opacity-60',
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg',
                feature.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
              )}
            >
              <Icon weight="duotone" className="h-5 w-5" />
            </div>
            <div onClick={handleToggle}>
              <Switch checked={feature.enabled} disabled={toggleMutation.isPending} />
            </div>
          </div>
          <CardTitle className="mt-3 text-base group-hover:text-primary">{feature.name}</CardTitle>
          <CardDescription className="line-clamp-2 text-sm">{feature.description}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center text-xs text-muted-foreground">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5',
                feature.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600',
              )}
            >
              {feature.enabled ? 'Active' : 'Inactive'}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
