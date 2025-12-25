import { Route, Routes } from "react-router-dom";
import { FeatureComponentProps } from '@/features';
import RecommendationsList from "./recommendations-list";
import RecommendationsEditor from "./recommendations-editor";

const SmartRecommendationsFeature = ({ featureId }: FeatureComponentProps) => {
  return (
    <Routes>
        <Route index element={<RecommendationsList featureId={featureId} />}/>
        <Route path="new" element={<RecommendationsEditor featureId={featureId} />}/>
        <Route path=":recommendationId" element={<RecommendationsEditor featureId={featureId} />}/>
    </Routes>
  );
};

export default SmartRecommendationsFeature;