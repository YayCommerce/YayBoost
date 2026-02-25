/**
 * Entity hooks for React Query
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Entity, EntityListResponse, entityApi } from '@/lib/api';

// Query keys
export const entityKeys = {
  all: ['entities'] as const,
  lists: () => [...entityKeys.all, 'list'] as const,
  list: (featureId: string, filters?: Record<string, unknown>) =>
    [...entityKeys.lists(), featureId, filters] as const,
  details: () => [...entityKeys.all, 'detail'] as const,
  detail: (featureId: string, entityId: number) =>
    [...entityKeys.details(), featureId, entityId] as const,
};

interface UseEntitiesParams {
  featureId: string;
  entityType?: string;
  status?: string;
  orderby?: string;
  order?: 'ASC' | 'DESC';
  perPage?: number;
  offset?: number;
  enabled?: boolean;
}

/**
 * Fetch all entities for a feature
 */
export function useEntities({
  featureId,
  entityType,
  status,
  orderby,
  order,
  perPage,
  offset,
  enabled = true,
}: UseEntitiesParams) {
  return useQuery({
    queryKey: entityKeys.list(featureId, { entityType, status, orderby, order, perPage, offset }),
    queryFn: () =>
      entityApi.getAll(featureId, {
        entity_type: entityType,
        status,
        orderby,
        order,
        per_page: perPage,
        offset,
      }),
    enabled: enabled && !!featureId,
  });
}

/**
 * Fetch single entity
 */
export function useEntity(featureId: string, entityId: number, entityType?: string) {
  return useQuery({
    queryKey: entityKeys.detail(featureId, entityId),
    queryFn: () => entityApi.get(featureId, entityId, entityType),
    enabled: !!featureId && !!entityId,
  });
}

/**
 * Create entity mutation
 */
export function useCreateEntity(featureId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      entity,
      entityType,
    }: {
      entity: Partial<Omit<Entity, 'id' | 'created_at' | 'updated_at'>>;
      entityType?: string;
    }) => entityApi.create(featureId, entity, entityType),
    onSuccess: () => {
      // Invalidate entity list to refetch
      queryClient.invalidateQueries({ queryKey: entityKeys.lists() });
    },
  });
}

/**
 * Update entity mutation
 */
export function useUpdateEntity(featureId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      entityId,
      entity,
      entityType,
    }: {
      entityId: number;
      entity: Partial<Omit<Entity, 'id' | 'created_at' | 'updated_at'>>;
      entityType?: string;
    }) => entityApi.update(featureId, entityId, entity, entityType),
    onSuccess: (updatedEntity) => {
      // Update entity in cache
      queryClient.setQueryData(entityKeys.detail(featureId, updatedEntity.id), updatedEntity);
      // Invalidate list to refetch
      queryClient.invalidateQueries({ queryKey: entityKeys.lists() });
    },
  });
}

/**
 * Delete entity mutation
 */
export function useDeleteEntity(featureId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ entityId, entityType }: { entityId: number; entityType?: string }) =>
      entityApi.delete(featureId, entityId, entityType),
    onSuccess: (_, { entityId }) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: entityKeys.detail(featureId, entityId) });
      // Invalidate list
      queryClient.invalidateQueries({ queryKey: entityKeys.lists() });
    },
  });
}

/**
 * Bulk action mutation
 */
export function useBulkEntityAction(featureId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      action,
      ids,
      entityType,
    }: {
      action: 'activate' | 'deactivate' | 'delete';
      ids: number[];
      entityType?: string;
    }) => entityApi.bulkAction(featureId, action, ids, entityType),
    onSuccess: () => {
      // Invalidate all entity queries
      queryClient.invalidateQueries({ queryKey: entityKeys.lists() });
    },
  });
}

/**
 * Reorder entities mutation
 */
export function useReorderEntities(featureId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ order, entityType }: { order: Record<number, number>; entityType?: string }) =>
      entityApi.reorder(featureId, order, entityType),
    onSuccess: () => {
      // Invalidate list to get updated order
      queryClient.invalidateQueries({ queryKey: entityKeys.lists() });
    },
  });
}
