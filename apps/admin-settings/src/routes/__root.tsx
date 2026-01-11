import { createRootRoute } from '@tanstack/react-router';
import { DashboardLayout } from '@/layouts/dashboard-layout';

export const Route = createRootRoute({
  component: DashboardLayout,
});
