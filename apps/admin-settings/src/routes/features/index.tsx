import { createFileRoute } from '@tanstack/react-router';
import FeatureContainer from '@/pages/Feature/FeatureContainer';

export const Route = createFileRoute('/features/')({
  component: FeatureContainer,
});
