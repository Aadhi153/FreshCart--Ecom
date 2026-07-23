export interface ProductRow {
  id: string;
  name: string;
  price: number | string;
  categories: { name: string } | null;
  image_url: string | null;
  stock_quantity: number;
  in_stock: boolean;
  rating: number | string | null;
  review_count: number | null;
  created_at: string;
  is_vegetarian: boolean | null;
  is_vegan: boolean | null;
  is_organic: boolean | null;
  is_on_sale: boolean | null;
}

export interface ProductCard {
  id: string;
  name: string;
  price: number;
  category: string;
  image_url?: string;
  stock_quantity: number;
  in_stock: boolean;
  rating: number;
  review_count: number;
  created_at: string;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_organic: boolean;
  is_on_sale: boolean;
}

export type PriceBucketKey = 'all' | 'under-50' | '50-100' | '100-200' | '200-500' | 'above-500';

export const PRICE_BUCKETS: { key: PriceBucketKey; label: string; test: (price: number) => boolean }[] = [
  { key: 'all', label: 'All Prices', test: () => true },
  { key: 'under-50', label: 'Under ₹50', test: (p) => p < 50 },
  { key: '50-100', label: '₹50 – ₹100', test: (p) => p >= 50 && p <= 100 },
  { key: '100-200', label: '₹100 – ₹200', test: (p) => p > 100 && p <= 200 },
  { key: '200-500', label: '₹200 – ₹500', test: (p) => p > 200 && p <= 500 },
  { key: 'above-500', label: 'Above ₹500', test: (p) => p > 500 },
];

export type SortKey = 'popular' | 'price-low' | 'price-high' | 'newest' | 'rating';

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'popular', label: '🔥 Popular' },
  { key: 'price-low', label: '⬆️ Price: Low to High' },
  { key: 'price-high', label: '⬇️ Price: High to Low' },
  { key: 'newest', label: '🆕 Newest First' },
  { key: 'rating', label: '⭐ Top Rated' },
];

export interface DietaryFilters {
  vegetarian: boolean;
  vegan: boolean;
  organic: boolean;
}

interface FilterOptions {
  search: string;
  categories: string[];
  priceBucket: PriceBucketKey;
  inStockOnly: boolean;
  dietary: DietaryFilters;
  onSaleOnly: boolean;
}

export function filterProducts(
  products: ProductCard[],
  { search, categories, priceBucket, inStockOnly, dietary, onSaleOnly }: FilterOptions,
): ProductCard[] {
  const term = search.trim().toLowerCase();
  const bucket = PRICE_BUCKETS.find((b) => b.key === priceBucket) ?? PRICE_BUCKETS[0];

  return products.filter((p) => {
    if (categories.length > 0 && !categories.includes(p.category)) return false;
    if (!bucket.test(p.price)) return false;
    if (inStockOnly && !(p.stock_quantity > 0 && p.in_stock)) return false;
    if (dietary.vegetarian && !p.is_vegetarian) return false;
    if (dietary.vegan && !p.is_vegan) return false;
    if (dietary.organic && !p.is_organic) return false;
    if (onSaleOnly && !p.is_on_sale) return false;
    if (term && !p.name.toLowerCase().includes(term) && !p.category.toLowerCase().includes(term)) return false;
    return true;
  });
}

// Faceted counts: each dimension is counted against products matching every *other*
// active filter, so e.g. category counts update as price/dietary filters change but
// aren't collapsed by the category selection itself (the standard "N remaining" pattern).
export function getCategoryCounts(
  products: ProductCard[],
  options: Omit<FilterOptions, 'categories'>,
): Record<string, number> {
  const matched = filterProducts(products, { ...options, categories: [] });
  const counts: Record<string, number> = {};
  for (const p of matched) counts[p.category] = (counts[p.category] || 0) + 1;
  return counts;
}

export function getPriceBucketCounts(
  products: ProductCard[],
  options: Omit<FilterOptions, 'priceBucket'>,
): Record<PriceBucketKey, number> {
  const matched = filterProducts(products, { ...options, priceBucket: 'all' });
  const counts = {} as Record<PriceBucketKey, number>;
  for (const bucket of PRICE_BUCKETS) {
    counts[bucket.key] = matched.filter((p) => bucket.test(p.price)).length;
  }
  return counts;
}

export function sortProducts(products: ProductCard[], sortBy: SortKey): ProductCard[] {
  const copy = [...products];
  switch (sortBy) {
    case 'price-low':
      return copy.sort((a, b) => a.price - b.price);
    case 'price-high':
      return copy.sort((a, b) => b.price - a.price);
    case 'newest':
      return copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    case 'rating':
      return copy.sort((a, b) => b.rating - a.rating);
    case 'popular':
    default:
      return copy.sort((a, b) => b.review_count - a.review_count);
  }
}
