/**
 * Onboarding Checklist Component
 *
 * Displays a checklist of steps for new users to get started.
 * Dismissable and auto-hides when all steps are complete.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { __ } from '@wordpress/i18n';
import { X, Check, Circle, ArrowRight, Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { dashboardApi, OnboardingStatusResponse } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

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
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="mb-4 h-2 w-full" />
          <div className="space-y-3">
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

  // Don't show if all complete (auto-dismiss behavior)
  if (data?.all_complete) {
    return null;
  }

  const handleAction = (path: string) => {
    navigate(path);
  };

  const handleDismiss = () => {
    dismissMutation.mutate();
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <CardHeader className="flex flex-row items-start justify-between pb-3">
        <div className="flex items-center gap-2">
          <Rocket className="text-primary h-5 w-5" />
          <CardTitle className="text-base">{__('Get Started with YayBoost', 'yayboost')}</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground -mt-1 -mr-2 h-8 w-8"
          onClick={handleDismiss}
          disabled={dismissMutation.isPending}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">{__('Dismiss', 'yayboost')}</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="text-muted-foreground flex justify-between text-sm">
            <span>
              {completedCount} {__('of', 'yayboost')} {totalSteps} {__('completed', 'yayboost')}
            </span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Steps list */}
        <div className="space-y-2">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                step.completed
                  ? 'border-[#A5D6A7] bg-[#E8F5E9] dark:border-[#1B5E20] dark:bg-[#1B5E20]/30'
                  : 'bg-background border-border'
              }`}
            >
              {/* Status icon */}
              <div className="flex-shrink-0">
                {step.completed ? (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#279727]">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                ) : (
                  <div className="border-muted-foreground/30 flex h-5 w-5 items-center justify-center rounded-full border">
                    <Circle className="text-muted-foreground/30 bg-muted-foreground/30 rounded-full h-2 w-2" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium ${step.completed ? 'text-muted-foreground line-through' : ''}`}
                >
                  {step.title}
                </p>
                {!step.completed && (
                  <p className="text-muted-foreground text-xs">{step.description}</p>
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
