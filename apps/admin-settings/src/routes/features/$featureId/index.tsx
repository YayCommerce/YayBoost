import { createFileRoute } from '@tanstack/react-router';
import Feature from '@/pages/Feature';

export const Route = createFileRoute('/features/$featureId/')({
  component: Feature,
});
