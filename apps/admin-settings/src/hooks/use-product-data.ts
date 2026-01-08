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
  });
}
