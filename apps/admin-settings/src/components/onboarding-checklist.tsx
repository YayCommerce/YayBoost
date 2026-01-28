/**
 * Onboarding Checklist Component
 *
 * Displays a checklist of steps for new users to get started.
 * Dismissable and auto-hides when all steps are complete.
 *
 * Design: shadcn/ui aligned with primary color accents
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { __ } from '@wordpress/i18n';
import { ArrowRight, Check, Rocket, X } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { dashboardApi, OnboardingStatusResponse } from '@/lib/api';

export function OnboardingChecklist() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<OnboardingStatusResponse>({
    queryKey: ['onboarding', 'status'],
    queryFn: () => dashboardApi.getOnboardingStatus(),
  });

  const dismissMutation = useMutation({
    mutationFn: () => dashboardApi.dismissOnboarding(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
    },
  });

  // Don't render if dismissed or loading with error
  if (error) {
    return null;
  }

  // Don't render if dismissed
  if (data?.dismissed) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-2 w-16" />
            <Skeleton className="h-2 flex-1" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const steps = data?.steps || [];
  const completedCount = steps.filter((s) => s.completed).length;
  const totalSteps = steps.length;
  const progressPercent = totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0;

  // Find the first incomplete step (next step)
  const nextStepIndex = steps.findIndex((s) => !s.completed);

  // Don't show if all complete (auto-dismiss behavior)
  if (data?.all_complete) {
    return null;
  }

  const handleAction = (path: string) => {
    navigate({ to: path });
  };

  const handleDismiss = () => {
    dismissMutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">{__('Quick Setup', 'yayboost')}</CardTitle>
        </div>
        <CardDescription>
          {__('Complete these steps to start boosting sales', 'yayboost')}
        </CardDescription>
        <CardAction>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
            disabled={dismissMutation.isPending}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">{__('Dismiss', 'yayboost')}</span>
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress section with dot indicators */}
        <div className="flex items-center gap-4">
          {/* Dot indicators */}
          <div className="flex gap-1.5">
            {steps.map((step, i) => (
              <div
                key={i}
                className={cn(
                  'h-2 w-2 rounded-full transition-colors',
                  step.completed ? 'bg-primary' : 'bg-muted-foreground/20',
                )}
              />
            ))}
          </div>

          {/* Progress bar */}
          <div className="flex flex-1 items-center gap-3">
            <Progress value={progressPercent} className="h-1.5 flex-1" />
            <span className="text-xs tabular-nums text-muted-foreground">
              {completedCount}/{totalSteps}
            </span>
          </div>
        </div>

        {/* Steps list */}
        <div className="space-y-2">
          {steps.map((step, index) => {
            const isNext = index === nextStepIndex;

            return (
              <div
                key={step.id}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-3 transition-all',
                  step.completed && 'bg-muted/50',
                  isNext && 'ring-2 ring-primary/20 border-primary/40',
                  !step.completed && !isNext && 'border-border',
                )}
              >
                {/* Step indicator */}
                <div className="flex-shrink-0">
                  {step.completed ? (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  ) : isNext ? (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-primary bg-primary/10">
                      <span className="text-xs font-semibold text-primary">{index + 1}</span>
                    </div>
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-muted-foreground/30">
                      <span className="text-xs text-muted-foreground">{index + 1}</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      step.completed && 'text-muted-foreground line-through',
                    )}
                  >
                    {step.title}
                  </p>
                  {!step.completed && step.description && (
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  )}
                </div>

                {/* Action button - only show on next step */}
                {isNext && step.action && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-shrink-0"
                    onClick={() => handleAction(step.action!.path)}
                  >
                    {step.action.label}
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default OnboardingChecklist;
