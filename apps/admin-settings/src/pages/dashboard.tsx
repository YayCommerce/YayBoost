import { __ } from "@wordpress/i18n";

import { DashboardStats } from "@/components/dashboard-stats";
import { FeatureHealthGrid } from "@/components/feature-health-grid";
import { OnboardingChecklist } from "@/components/onboarding-checklist";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{__('Welcome to YayBoost', 'yayboost')}</h1>
        <p className="text-muted-foreground">{__('Encourage more sales with our suite of features', 'yayboost')}</p>
      </div>

      {/* Onboarding Checklist (shown for new users) */}
      <OnboardingChecklist />

      {/* Feature Health Grid */}
      <FeatureHealthGrid />

      {/* Analytics Overview */}
      <DashboardStats />
    </div>
  );
}
