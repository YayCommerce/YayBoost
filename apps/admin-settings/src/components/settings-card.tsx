import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface SettingsCardProps {
  title?: string;
  description?: string;
  children: ReactNode;
  onSave: () => void;
  onReset?: () => void;
  isSaving?: boolean;
  isLoading?: boolean;
  isDirty?: boolean;
  headless?: boolean;
}

export function SettingsCard({
  title,
  description,
  children,
  onSave,
  onReset,
  isSaving = false,
  isLoading = false,
  isDirty = false,
  headless = false,
}: SettingsCardProps) {
  if (isLoading) {
    return (
      <Card>
        {!headless && (
          <>
            <CardHeader>
              {title && <CardTitle>{title}</CardTitle>}
              {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
            <Separator />
          </>
        )}
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {!headless && (
        <>
          <CardHeader>
            {title && <CardTitle className="text-base">{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
          <Separator />
        </>
      )}
      <CardContent className="space-y-6">
        {children}
        <div className="flex gap-2">
          <Button onClick={onSave} disabled={isSaving || !isDirty}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
          {isDirty && onReset && (
            <Button variant="outline" onClick={onReset} disabled={isSaving}>
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
