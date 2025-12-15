/**
 * Feature hooks for React Query
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Feature, featureApi } from '@/lib/api';

// Query keys
export const featureKeys = {
  all: ['features'] as const,
  lists: () => [...featureKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...featureKeys.lists(), filters] as const,
  details: () => [...featureKeys.all, 'detail'] as const,
  detail: (id: string) => [...featureKeys.details(), id] as const,
  categories: () => [...featureKeys.all, 'categories'] as const,
};

/**
 * Fetch all features
 */
export function useFeatures() {
  return useQuery({
    queryKey: featureKeys.lists(),
    queryFn: featureApi.getAll,
  });
}

/**
 * Fetch all feature categories
 */
export function useFeatureCategories() {
  return useQuery({
    queryKey: featureKeys.categories(),
    queryFn: featureApi.getCategories,
  });
}

/**
 * Fetch single feature by ID
 * @param id Feature ID
 * @param forceRefresh If true, always refetch on mount. If false, use cache if available.
 */
export function useFeature(id: string, forceRefresh?: boolean) {
  return useQuery({
    queryKey: featureKeys.detail(id),
    queryFn: () => featureApi.get(id),
    enabled: !!id,
    refetchOnMount: forceRefresh ? 'always' : false,
  });
}

/**
 * Toggle feature enabled/disabled
 */
export function useToggleFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      featureApi.toggle(id, enabled),
    onSuccess: (updatedFeature) => {
      // Update the feature in the list cache
      queryClient.setQueryData<Feature[]>(featureKeys.lists(), (old) =>
        old?.map((f) => (f.id === updatedFeature.id ? updatedFeature : f)),
      );
      // Update the individual feature cache
      queryClient.setQueryData(featureKeys.detail(updatedFeature.id), updatedFeature);
    },
  });
}

/**
 * Update feature settings
 */
export function useUpdateFeatureSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, settings }: { id: string; settings: Record<string, unknown> }) =>
      featureApi.updateSettings(id, settings),
    onSuccess: (updatedFeature) => {
      // Update the feature in the list cache
      queryClient.setQueryData<Feature[]>(featureKeys.lists(), (old) =>
        old?.map((f) => (f.id === updatedFeature.id ? updatedFeature : f)),
      );
      // Update the individual feature cache
      queryClient.setQueryData(featureKeys.detail(updatedFeature.id), updatedFeature);
    },
  });
}

/**
 * Group features by category
 */
export function useFeaturesByCategory() {
  const { data: features, ...rest } = useFeatures();
  const { data: categories } = useFeatureCategories();

  const grouped = features?.reduce(
    (acc, feature) => {
      const category = feature.category || 'general';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(feature);
      return acc;
    },
    {} as Record<string, Feature[]>,
  );

  // Sort features within each category by priority
  if (grouped) {
    Object.keys(grouped).forEach((category) => {
      grouped[category].sort((a, b) => a.priority - b.priority);
    });
  }

  return {
    ...rest,
    data: grouped,
    categories,
  };
}
