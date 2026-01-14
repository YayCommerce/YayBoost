import { __ } from '@wordpress/i18n';

import { DashboardStats } from '@/components/dashboard-stats';
import { FeatureHealthGrid } from '@/components/feature-health-grid';
import { OnboardingChecklist } from '@/components/onboarding-checklist';
import { RecentActivityFeed } from '@/components/recent-activity-feed';

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{__('Welcome to YayBoost', 'yayboost')}</h1>
        <p className="text-muted-foreground">
          {__('Encourage more sales with our suite of features', 'yayboost')}
        </p>
      </div>

      {/* Onboarding Checklist (shown for new users) */}
      <OnboardingChecklist />

      {/* Analytics Overview */}
      <DashboardStats />

      {/* Feature Health + Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <FeatureHealthGrid />
        <RecentActivityFeed />
      </div>
    </div>
  );
}
