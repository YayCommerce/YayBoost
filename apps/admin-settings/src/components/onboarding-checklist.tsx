/**
 * Onboarding Checklist Component
 *
 * Displays a checklist of steps for new users to get started.
 * Dismissable and auto-hides when all steps are complete.
 *
 * Design: Modern card with glassmorphism accents, clear visual hierarchy,
 * and smooth micro-interactions following UX best practices.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { __ } from '@wordpress/i18n';
import { ArrowRight, Check, ChevronRight, Rocket, Sparkles, X } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';
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

  if (data?.dismissed) {
    sessionStorage.setItem('yayboost_onboarding_dismissed', 'true');
  }

  // Don't render if dismissed
  if (sessionStorage.getItem('yayboost_onboarding_dismissed') === 'true') {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
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
    <div className="relative overflow-hidden rounded-xl border bg-card shadow-sm">
      {/* Decorative gradient background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-transparent" />

      {/* Header section */}
      <div className="relative border-b px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {/* Icon with gradient background */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-accent shadow-sm">
              <Rocket className="h-5 w-5 text-primary-foreground" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight">
                {__('Quick Setup', 'yayboost')}
              </h2>
              <p className="text-sm text-muted-foreground">
                {__('Complete these steps to start boosting sales', 'yayboost')}
              </p>
            </div>
          </div>

          {/* Dismiss button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 cursor-pointer text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
            onClick={handleDismiss}
            disabled={dismissMutation.isPending}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">{__('Dismiss', 'yayboost')}</span>
          </Button>
        </div>

        {/* Progress bar */}
        <div className="mt-4 flex items-center gap-3">
          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-primary-accent transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="shrink-0 text-sm font-medium tabular-nums text-muted-foreground">
            {completedCount}/{totalSteps}
          </span>
        </div>
      </div>

      {/* Steps grid */}
      <div className="relative grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step, index) => {
          const isNext = index === nextStepIndex;
          const isCompleted = step.completed;

          return (
            <div
              key={step.id}
              onClick={() => {
                if (isNext && step.action) {
                  handleAction(step.action.path);
                }
              }}
              className={cn(
                'group relative flex flex-col rounded-xl border p-4 transition-all duration-200',
                isCompleted && 'border-success/30 bg-success/[0.03]',
                isNext &&
                  'cursor-pointer border-primary/40 bg-primary/[0.03] shadow-sm hover:border-primary/60 hover:bg-primary/[0.05] hover:shadow-md',
                !isCompleted && !isNext && 'border-border bg-muted/30 opacity-60',
              )}
            >
              {/* Step number badge */}
              <div className="mb-3 flex items-center justify-between">
                <div
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all duration-200',
                    isCompleted && 'bg-success text-success-foreground',
                    isNext && 'bg-primary text-primary-foreground',
                    !isCompleted && !isNext && 'bg-muted-foreground/20 text-muted-foreground',
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                </div>

                {/* Status indicator */}
                {isNext && (
                  <span className="flex items-center gap-1 text-xs font-medium text-primary">
                    <Sparkles className="h-3 w-3" />
                    {__('Next', 'yayboost')}
                  </span>
                )}
                {isCompleted && (
                  <span className="text-xs font-medium text-success">
                    {__('Done', 'yayboost')}
                  </span>
                )}
              </div>

              {/* Step content */}
              <div className="flex-1 space-y-1">
                <h3
                  className={cn(
                    'text-sm font-medium leading-snug',
                    isCompleted && 'text-muted-foreground',
                    isNext && 'text-foreground',
                    !isCompleted && !isNext && 'text-muted-foreground',
                  )}
                >
                  {step.title}
                </h3>
                {!isCompleted && step.description && (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                )}
              </div>

              {/* Action indicator for next step */}
              {isNext && step.action && (
                <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs">
                  <span className="font-medium text-primary">{step.action.label}</span>
                  <ChevronRight className="h-4 w-4 text-primary transition-transform duration-200 group-hover:translate-x-0.5" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer with skip option */}
      <div className="border-t bg-muted/30 px-6 py-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {__('You can always access features from the sidebar', 'yayboost')}
          </p>
          <Button
            variant="link"
            size="sm"
            className="h-auto cursor-pointer p-0 text-xs text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
            disabled={dismissMutation.isPending}
          >
            {__('Skip setup', 'yayboost')}
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default OnboardingChecklist;
