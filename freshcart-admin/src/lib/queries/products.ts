import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Product } from '@freshcart/types';
import {
  getProducts,
  getCategories,
  getProductSoldQuantities,
  createProduct,
  deleteProduct,
} from '../api';

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
};

export function useProducts() {
  return useQuery({ queryKey: productKeys.lists(), queryFn: getProducts, refetchInterval: 30_000 });
}

export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: getCategories, staleTime: 5 * 60_000 });
}

export function useProductSoldQuantities() {
  return useQuery({ queryKey: ['products', 'sold-quantities'], queryFn: getProductSoldQuantities });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Product>) => createProduct(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.lists() }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.lists() }),
  });
}
