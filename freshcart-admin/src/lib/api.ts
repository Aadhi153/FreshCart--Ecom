import { supabase } from './supabase';

import type { Product, Order, Profile, Category } from '@freshcart/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ── Categories ────────────────────────────────────────────────────────────────
export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('display_order');
  if (error) throw error;
  return data || [];
}

export async function createCategory(name: string): Promise<Category> {
  const trimmedName = name.trim();
  const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const { data: existingRows, error: lookupError } = await supabase.from('categories').select('*').eq('slug', slug).limit(1);
  if (lookupError) throw lookupError;
  if (existingRows && existingRows.length > 0) return existingRows[0];

  const { data, error } = await supabase
    .from('categories')
    .insert([{ name: trimmedName, slug }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Total units sold per product, keyed by product_id. Excludes cancelled orders,
// since a cancelled order's stock reservation is never actually fulfilled.
export async function getProductSoldQuantities(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('order_items')
    .select('product_id, quantity, orders(status)');
  if (error) throw error;

  const sold: Record<string, number> = {};
  for (const item of data || []) {
    const orderStatus = (item.orders as unknown as { status: string } | null)?.status;
    if (orderStatus === 'cancelled') continue;
    sold[item.product_id] = (sold[item.product_id] || 0) + item.quantity;
  }
  return sold;
}

export async function uploadProductImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('product-images').upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from('product-images').getPublicUrl(path);
  return data.publicUrl;
}

// ── Products ──────────────────────────────────────────────────────────────────
export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(id, name, slug), product_variants(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  // Map Supabase's product_variants to the expected "variants" field for UI consistency
  const products = (data || []).map(p => ({
    ...p,
    variants: p.product_variants || [],
  }));
  return products;
}

export async function getProduct(id: string): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(id, name, slug), product_variants(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return { ...data, variants: data.product_variants || [] };
}

export async function createProduct(product: Partial<Product>): Promise<Product> {
  const { variants, ...productData } = product;
  const { data, error } = await supabase
    .from('products')
    .insert([productData])
    .select()
    .single();
  if (error) throw error;

  if (variants && variants.length > 0) {
    const variantsToInsert = variants.map(v => ({ ...v, product_id: data.id }));
    const { error: varError } = await supabase.from('product_variants').insert(variantsToInsert);
    if (varError) console.error('Error inserting variants:', varError);
  }

  return data;
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
  const { variants, ...productData } = updates;
  const { data, error } = await supabase
    .from('products')
    .update(productData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;

  if (variants !== undefined) {
    await supabase.from('product_variants').delete().eq('product_id', id);
    if (variants.length > 0) {
      const variantsToInsert = variants.map(v => ({ name: v.name, price_adjustment: v.price_adjustment, stock_quantity: v.stock_quantity, image_url: v.image_url, product_id: id }));
      const { error: varError } = await supabase.from('product_variants').insert(variantsToInsert);
      if (varError) console.error('Error updating variants:', varError);
    }
  }

  return data;
}

export async function deleteProduct(id: string): Promise<boolean> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ── Orders ────────────────────────────────────────────────────────────────────
export async function getOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function updateOrderStatus(id: string, status: Order['status']): Promise<Order> {
  const { data: session } = await supabase.auth.getSession();
  const token = session?.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_URL}/api/orders/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ status })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update order status');
  }
  return res.json();
}

// ── Profiles ──────────────────────────────────────────────────────────────────
export async function getProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export async function getAnalyticsSummary() {
  const { data: session } = await supabase.auth.getSession();
  const token = session?.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_URL}/api/analytics/summary`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch analytics');
  }
  return res.json();
}
