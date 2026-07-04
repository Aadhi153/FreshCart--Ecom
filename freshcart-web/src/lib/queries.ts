import { supabase } from './supabase';

export interface CheapestVariant {
  id: string;
  name: string;
  priceAdjustment: number;
  image: string | null;
}

// Quick "Add to Cart" actions (grid cards, recommendation rails) don't show a
// variant picker, so they need to know which variant to add on the user's
// behalf — the cheapest one, matching what the product detail page defaults to.
export async function getCheapestVariant(productId: string): Promise<CheapestVariant | null> {
  const { data } = await supabase
    .from('product_variants')
    .select('id, name, price_adjustment, image_url')
    .eq('product_id', productId)
    .order('price_adjustment', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    priceAdjustment: Number(data.price_adjustment),
    image: data.image_url,
  };
}

export interface HomeProductCard {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
}

interface ProductRow {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  categories: { name: string } | null;
}

const SELECT = 'id, name, price, image_url, categories(name)';

function mapRow(p: ProductRow): HomeProductCard {
  return {
    id: p.id,
    name: p.name,
    price: Number(p.price),
    category: p.categories?.name || 'Uncategorized',
    image: p.image_url || '',
  };
}

export async function getFeaturedProducts(limit = 3): Promise<HomeProductCard[]> {
  const { data } = await supabase
    .from('products')
    .select(SELECT)
    .eq('in_stock', true)
    .limit(limit)
    .returns<ProductRow[]>();
  return (data || []).map(mapRow);
}

export async function getBestSellers(limit = 4): Promise<HomeProductCard[]> {
  const { data } = await supabase
    .from('products')
    .select(SELECT)
    .eq('in_stock', true)
    .order('rating', { ascending: false })
    .order('review_count', { ascending: false })
    .limit(limit)
    .returns<ProductRow[]>();
  return (data || []).map(mapRow);
}

export async function getNewArrivals(limit = 4): Promise<HomeProductCard[]> {
  const { data } = await supabase
    .from('products')
    .select(SELECT)
    .eq('in_stock', true)
    .order('created_at', { ascending: false })
    .limit(limit)
    .returns<ProductRow[]>();
  return (data || []).map(mapRow);
}

export interface RatedProductCard extends HomeProductCard {
  rating: number;
  reviewCount: number;
}

interface RatedProductRow extends ProductRow {
  rating: number | string | null;
  review_count: number | null;
}

const RATED_SELECT = 'id, name, price, image_url, categories(name), rating, review_count';

function mapRatedRow(p: RatedProductRow): RatedProductCard {
  return { ...mapRow(p), rating: Number(p.rating) || 0, reviewCount: p.review_count ?? 0 };
}

export async function getTopRatedProducts(limit = 8): Promise<RatedProductCard[]> {
  const { data } = await supabase
    .from('products')
    .select(RATED_SELECT)
    .eq('in_stock', true)
    .order('rating', { ascending: false })
    .order('review_count', { ascending: false })
    .limit(limit)
    .returns<RatedProductRow[]>();
  return (data || []).map(mapRatedRow);
}

export async function getRelatedProducts(categoryId: string, excludeId: string, limit = 5): Promise<RatedProductCard[]> {
  const { data } = await supabase
    .from('products')
    .select(RATED_SELECT)
    .eq('category_id', categoryId)
    .neq('id', excludeId)
    .eq('in_stock', true)
    .limit(limit)
    .returns<RatedProductRow[]>();
  return (data || []).map(mapRatedRow);
}

// `.in()` doesn't preserve the order of the ids you pass in, so re-sort the result
// to match — callers rely on this to keep "recently viewed" in visit order.
export async function getProductsByIds(ids: string[]): Promise<HomeProductCard[]> {
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from('products')
    .select(SELECT)
    .in('id', ids)
    .returns<(ProductRow & { id: string })[]>();
  const byId = new Map((data || []).map((row) => [row.id, mapRow(row)]));
  return ids.map((id) => byId.get(id)).filter((row): row is HomeProductCard => Boolean(row));
}

export interface Testimonial {
  id: string;
  rating: number;
  comment: string;
  reviewerName: string;
  productName: string;
}

interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  profiles: { full_name: string | null } | null;
  products: { name: string } | null;
}

// Only surfaces reviews that are both positive and have real written feedback,
// since a bare star rating with no comment reads as filler on a landing page.
export async function getTopTestimonials(limit = 6): Promise<Testimonial[]> {
  const { data } = await supabase
    .from('reviews')
    .select('id, rating, comment, profiles(full_name), products(name)')
    .gte('rating', 4)
    .not('comment', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit)
    .returns<ReviewRow[]>();

  return (data || [])
    .filter((r) => (r.comment || '').trim().length > 0)
    .map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment as string,
      reviewerName: r.profiles?.full_name || 'Verified buyer',
      productName: r.products?.name || 'FreshCart',
    }));
}
