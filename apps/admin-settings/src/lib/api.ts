/**
 * API Client for YayBoost REST API
 */

import axios, { AxiosError, AxiosInstance } from 'axios';

// Types from WordPress localized data
declare global {
  interface Window {
    yayboostData?: {
      apiUrl: string;
      nonce: string;
      version: string;
      currencySymbol?: string;
      urls: {
        images: string;
        wcPlaceholderImage: string;
      };
    };
  }
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiError {
  code: string;
  message: string;
  data?: {
    status: number;
  };
}

// Feature types
export interface Feature {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  priority: number;
  enabled: boolean;
  settings: Record<string, unknown>;
}

export interface FeatureCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

// Entity types
export interface Entity {
  id: number;
  feature_id: string;
  entity_type: string;
  name: string;
  settings: Record<string, unknown>;
  status: 'active' | 'inactive' | 'draft';
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface EntityListResponse {
  items: Entity[];
  total: number;
}

// Create axios instance
const createApiClient = (): AxiosInstance => {
  const baseURL = window.yayboostData?.apiUrl || '/wp-json/yayboost/v1';
  const nonce = window.yayboostData?.nonce || '';

  const client = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
      'X-WP-Nonce': nonce,
    },
  });

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiError>) => {
      const message = error.response?.data?.message || error.message || 'An error occurred';
      return Promise.reject(new Error(message));
    },
  );

  return client;
};

const api = createApiClient();

// Feature API
export const featureApi = {
  getAll: async (): Promise<Feature[]> => {
    const { data } = await api.get<ApiResponse<Feature[]>>('/features');
    return data.data;
  },

  getCategories: async (): Promise<FeatureCategory[]> => {
    const { data } = await api.get<ApiResponse<FeatureCategory[]>>('/features/categories');
    return data.data;
  },

  get: async (id: string): Promise<Feature> => {
    const { data } = await api.get<ApiResponse<Feature>>(`/features/${id}`);
    return data.data;
  },

  toggle: async (id: string, enabled: boolean): Promise<Feature> => {
    const { data } = await api.patch<ApiResponse<{ feature: Feature }>>(`/features/${id}`, {
      enabled,
    });
    return data.data.feature;
  },

  updateSettings: async (id: string, settings: Record<string, unknown>): Promise<Feature> => {
    const { data } = await api.patch<ApiResponse<{ feature: Feature }>>(
      `/features/${id}/settings`,
      settings,
    );
    return data.data.feature;
  },
};

// Entity API
export const entityApi = {
  getAll: async (
    featureId: string,
    params?: {
      entity_type?: string;
      status?: string;
      orderby?: string;
      order?: 'ASC' | 'DESC';
      per_page?: number;
      offset?: number;
    },
  ): Promise<EntityListResponse> => {
    const { data } = await api.get<ApiResponse<EntityListResponse>>(
      `/features/${featureId}/entities`,
      { params },
    );
    return data.data;
  },

  get: async (featureId: string, entityId: number, entityType?: string): Promise<Entity> => {
    const { data } = await api.get<ApiResponse<Entity>>(
      `/features/${featureId}/entities/${entityId}`,
      { params: { entity_type: entityType } },
    );
    return data.data;
  },

  create: async (
    featureId: string,
    entity: Partial<Omit<Entity, 'id' | 'created_at' | 'updated_at'>>,
  ): Promise<Entity> => {
    const { data } = await api.post<ApiResponse<{ entity: Entity }>>(
      `/features/${featureId}/entities`,
      entity,
    );
    return data.data.entity;
  },

  update: async (
    featureId: string,
    entityId: number,
    entity: Partial<Omit<Entity, 'id' | 'created_at' | 'updated_at'>>,
  ): Promise<Entity> => {
    const { data } = await api.patch<ApiResponse<{ entity: Entity }>>(
      `/features/${featureId}/entities/${entityId}`,
      entity,
    );
    return data.data.entity;
  },

  delete: async (featureId: string, entityId: number, entityType?: string): Promise<void> => {
    await api.delete(`/features/${featureId}/entities/${entityId}`, {
      params: { entity_type: entityType },
    });
  },

  bulkAction: async (
    featureId: string,
    action: 'activate' | 'deactivate' | 'delete',
    ids: number[],
    entityType?: string,
  ): Promise<{ count: number }> => {
    const { data } = await api.post<ApiResponse<{ count: number }>>(
      `/features/${featureId}/entities/bulk`,
      { action, ids, entity_type: entityType },
    );
    return data.data;
  },

  reorder: async (
    featureId: string,
    order: Record<number, number>,
    entityType?: string,
  ): Promise<void> => {
    await api.post(`/features/${featureId}/entities/reorder`, {
      order,
      entity_type: entityType,
    });
  },
};

// FBT Backfill types
export interface FBTBackfillStartResponse {
  total: number;
  total_orders: number;
  already_processed: number;
  batch_size: number;
  batches_count: number;
}

export interface FBTBackfillBatchResponse {
  processed: number;
  last_order_id: number;
  remaining: number;
  completed: boolean;
  errors: number;
}

export interface FBTBackfillStatusResponse {
  total: number;
  unprocessed: number;
  already_processed: number;
  last_order_id: number;
  is_running: boolean;
  last_run: string | null;
}

// FBT API
export const fbtApi = {
  /**
   * Start backfill process
   */
  startBackfill: async (batchSize: number): Promise<FBTBackfillStartResponse> => {
    const { data } = await api.post<ApiResponse<FBTBackfillStartResponse>>('/fbt/backfill/start', {
      batch_size: batchSize,
    });
    return data.data;
  },

  /**
   * Process a batch of orders
   */
  processBatch: async (
    batchSize: number,
    lastOrderId: number,
  ): Promise<FBTBackfillBatchResponse> => {
    const { data } = await api.post<ApiResponse<FBTBackfillBatchResponse>>(
      '/fbt/backfill/process',
      {
        batch_size: batchSize,
        last_order_id: lastOrderId,
      },
    );
    return data.data;
  },

  /**
   * Get current backfill status
   */
  getStatus: async (): Promise<FBTBackfillStatusResponse> => {
    const { data } = await api.get<ApiResponse<FBTBackfillStatusResponse>>('/fbt/backfill/status');
    return data.data;
  },
};

export default api;
