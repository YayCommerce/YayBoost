import { useEffect, useState } from 'react';
import { useInfiniteQuery, useQuery, UseQueryResult } from '@tanstack/react-query';

import api from '@/lib/api';

export interface CategoryOption {
  value: string;
  label: string;
}

export interface ProductOption {
  value: string;
  label: string;
}

export interface ProductWithPrice extends ProductOption {
  regular_price: number;
  image?: string | null;
}

/**
 * Fetch product categories
 */
export function useProductCategories(): UseQueryResult<CategoryOption[], Error> {
  return useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const response = await api.get('/product-data/categories');
      return response.data.data as CategoryOption[];
    },
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch product tags (WooCommerce product_tag)
 */
export function useProductTags(): UseQueryResult<CategoryOption[], Error> {
  return useQuery({
    queryKey: ['product-tags'],
    queryFn: async () => {
      const response = await api.get('/product-data/tags');
      return response.data.data as CategoryOption[];
    },
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch a single product by ID (includes regular_price for bump pricing)
 */
export function useProduct(
  productId: string | null | undefined
): UseQueryResult<ProductWithPrice | null, Error> {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (!productId) return null;
      const response = await api.get(`/product-data/products/${productId}`);
      return response.data.data as ProductWithPrice;
    },
    enabled: !!productId,
    refetchOnWindowFocus: false,
  });
}

/**
 * Get products (with optional search)
 * - No search: returns first 20 products
 * - With search: returns all matching products from DB
 */
export function useProducts(searchTerm: string = '') {
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  return useQuery({
    queryKey: ['products', debouncedSearch],
    queryFn: async () => {
      const params = debouncedSearch ? { search: debouncedSearch } : {};
      const response = await api.get('/product-data/products', { params });
      return response.data.data as ProductOption[];
    },
    refetchOnWindowFocus: false,
  });
}
