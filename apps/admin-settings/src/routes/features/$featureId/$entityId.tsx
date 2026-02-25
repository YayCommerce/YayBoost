import { createFileRoute, useParams } from '@tanstack/react-router';
import BumpEditor from '@/features/order-bump/bump-editor';
import RecommendationsEditor from '@/features/smart-recommendations/recommendations-editor';

function EntityEditor() {
  const { featureId } = useParams({ strict: false });
  if (featureId === 'order_bump') {
    return <BumpEditor />;
  }
  return <RecommendationsEditor />;
}

export const Route = createFileRoute('/features/$featureId/$entityId')({
  component: EntityEditor,
});
