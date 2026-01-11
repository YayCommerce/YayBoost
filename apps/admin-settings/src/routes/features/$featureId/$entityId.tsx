import { createFileRoute } from '@tanstack/react-router';
import RecommendationsEditor from '@/features/smart-recommendations/recommendations-editor';

export const Route = createFileRoute('/features/$featureId/$entityId')({
  component: RecommendationsEditor,
});
