import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { __ } from '@wordpress/i18n';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/sonner';

interface SettingsCardProps {
  title?: string;
  description?: string;
  children: ReactNode;
  onSave: () => void;
  onReset?: () => void;
  isSaving?: boolean;
  isLoading?: boolean;
  isDirty?: boolean;
  disabled?: boolean;
  headless?: boolean;
  buttonText?: string;
  cancelButtonText?: string;
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
  disabled = true,
  buttonText = __('Save Changes', 'yayboost'),
  cancelButtonText = __('Cancel', 'yayboost'),
}: SettingsCardProps) {
  const prevIsSavingRef = useRef(isSaving);
  useEffect(() => {
    const prevIsSaving = prevIsSavingRef.current;

    if (prevIsSaving && !isSaving) {
      toast.success('Settings saved successfully');
    }

    prevIsSavingRef.current = isSaving;
  }, [isSaving]);

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
          <Button onClick={onSave} disabled={disabled && (isSaving || !isDirty)}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {buttonText}
          </Button>
          {isDirty && onReset && (
            <Button variant="outline" onClick={onReset} disabled={isSaving}>
              {cancelButtonText}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
