import { Route, Routes } from "react-router-dom";
import { FeatureComponentProps } from '@/features';
import RecommendationsList from "./recommendations-list";
import RecommendationsEditor from "./recommendations-editor";

const SmartRecommendationsFeature = ({ featureId }: FeatureComponentProps) => {
  return (
    <Routes>
        <Route index element={<RecommendationsList featureId={featureId} />}/>
        <Route path="edit/:recommendationId" element={<RecommendationsEditor />}/>
    </Routes>
  );
};

export default SmartRecommendationsFeature;