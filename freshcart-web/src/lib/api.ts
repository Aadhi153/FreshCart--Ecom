import { supabase } from './supabase';
import type { PlaceOrderPayload, Order } from '@freshcart/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function request(path: string, options: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    });
  } catch {
    // fetch() rejects with a raw TypeError ("Failed to fetch") when the server is
    // unreachable (down, wrong port, no network) — that message is meaningless to
    // a customer, so translate it into something actionable.
    throw new Error("Can't reach the server right now. Please check your connection and try again.");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res;
}

async function authFetch(path: string, options: RequestInit = {}) {
  const res = await request(path, options);
  return res.json();
}

export const placeOrder = (payload: PlaceOrderPayload): Promise<Order> =>
  authFetch('/api/orders', { method: 'POST', body: JSON.stringify(payload) });

export async function getMyOrders(page = 1, limit = 10, status?: string): Promise<{ orders: Order[]; total: number }> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status && status !== 'all') params.set('status', status);
  const res = await request(`/api/orders?${params}`);
  const orders = await res.json();
  const total = Number(res.headers.get('X-Total-Count')) || orders.length;
  return { orders, total };
}

export const cancelOrder = (orderId: string): Promise<Order> =>
  authFetch(`/api/orders/${orderId}/cancel`, { method: 'PATCH' });

export const getOrderById = (orderId: string): Promise<Order> =>
  authFetch(`/api/orders/${orderId}`);

export const submitReview = (productId: string, rating: number, comment: string) =>
  authFetch(`/api/products/${productId}/reviews`, { method: 'POST', body: JSON.stringify({ rating, comment }) });

// Path is prefixed with the user's own id (avatars/<uid>/<file>) so the storage
// RLS policy can scope writes to "your own folder only".
export async function uploadAvatarImage(file: File, userId: string): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}
