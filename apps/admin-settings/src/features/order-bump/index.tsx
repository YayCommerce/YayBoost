/**
 * Order Bump Feature - Main Entry Point
 *
 * Complex feature with entity CRUD (multiple bump offers).
 * Uses sub-routing for list/create/edit views.
 */

import { Route, Routes } from 'react-router-dom';

import { FeatureComponentProps } from '@/features';

import { BumpList } from './bump-list';
import { BumpEditor } from './bump-editor';
import { BumpSettings } from './bump-settings';

export default function OrderBumpFeature({ featureId }: FeatureComponentProps) {
  return (
    <Routes>
      <Route index element={<BumpList featureId={featureId} />} />
      <Route path="new" element={<BumpEditor featureId={featureId} />} />
      <Route path=":bumpId" element={<BumpEditor featureId={featureId} />} />
      <Route path="settings" element={<BumpSettings featureId={featureId} />} />
    </Routes>
  );
}
