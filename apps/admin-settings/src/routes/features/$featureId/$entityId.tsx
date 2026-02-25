import BumpEditor from '@/features/order-bump/bump-editor';
import PostPurchaseUpsellsEditor from '@/features/post-purchase-upsells/purchase-editor';
import RecommendationsEditor from '@/features/smart-recommendations/recommendations-editor';
import { createFileRoute, useParams } from '@tanstack/react-router';

function EntityEditor() {
  const { featureId } = useParams({ strict: false });
  if (featureId === 'order_bump') {
    return <BumpEditor />;
  }
  if (featureId === 'post_purchase_upsells') {
    return <PostPurchaseUpsellsEditor />;
  }
  return <RecommendationsEditor />;
}

export const Route = createFileRoute('/features/$featureId/$entityId')({
  component: EntityEditor,
});
