/**
 * Onboarding Checklist Component
 *
 * Displays a checklist of steps for new users to get started.
 * Dismissable and auto-hides when all steps are complete.
 *
 * Design: Clean card with semantic color tokens (shadcn/ui aligned)
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { __ } from '@wordpress/i18n';
import { ArrowRight, CheckCircle2, Circle, Rocket, X } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
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
        <CardHeader className="pb-4">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-2 w-full" />
          <div className="space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const steps = data?.steps || [];
  const completedCount = steps.filter((s) => s.completed).length;
  const totalSteps = steps.length;
  const progressPercent = totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0;

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
      <CardHeader className="flex flex-row items-start justify-between pb-4">
        <div className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-medium">
            {__('Get Started with YayBoost', 'yayboost')}
          </CardTitle>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="-mr-2 -mt-1 h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={handleDismiss}
          disabled={dismissMutation.isPending}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">{__('Dismiss', 'yayboost')}</span>
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              {completedCount} {__('of', 'yayboost')} {totalSteps} {__('completed', 'yayboost')}
            </span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2 [&>div]:bg-success" />
        </div>

        {/* Steps list */}
        <div className="space-y-3">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                step.completed
                  ? 'border-success/20 bg-success/5'
                  : 'border-border bg-card'
              }`}
            >
              {/* Status icon */}
              <div className="flex-shrink-0">
                {step.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground/40" />
                )}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium ${
                    step.completed ? 'text-muted-foreground line-through' : 'text-foreground'
                  }`}
                >
                  {step.title}
                </p>
                {!step.completed && step.description && (
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                )}
              </div>

              {/* Action button */}
              {!step.completed && step.action && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0"
                  onClick={() => handleAction(step.action!.path)}
                >
                  {step.action.label}
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default OnboardingChecklist;
