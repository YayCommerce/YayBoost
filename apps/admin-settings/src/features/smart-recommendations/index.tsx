/**
 * Smart Recommendations Feature
 * Sub-routes are handled in routes.tsx (not here)
 */
import { FeatureComponentProps } from '@/features';
import RecommendationsList from './recommendations-list';

const SmartRecommendationsFeature = ({ featureId }: FeatureComponentProps) => {
  // Sub-routes (/new, /:entityId) are defined in routes.tsx
  // This component just renders the list view
  return <RecommendationsList featureId={featureId} />;
};

export default SmartRecommendationsFeature;
