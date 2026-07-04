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

interface FilterOptions {
  search: string;
  category: string;
  priceBucket: PriceBucketKey;
}

export function filterProducts(products: ProductCard[], { search, category, priceBucket }: FilterOptions): ProductCard[] {
  const term = search.trim().toLowerCase();
  const bucket = PRICE_BUCKETS.find((b) => b.key === priceBucket) ?? PRICE_BUCKETS[0];

  return products.filter((p) => {
    if (category !== 'All' && p.category !== category) return false;
    if (!bucket.test(p.price)) return false;
    if (term && !p.name.toLowerCase().includes(term) && !p.category.toLowerCase().includes(term)) return false;
    return true;
  });
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
