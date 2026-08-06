import { RETURN_WINDOW_DAYS, type Order } from '@freshcart/types';

// Shared by OrdersDetails (per-item Return/Replace button) and ReturnsList
// (personalized empty-state eligibility count) so both agree on the same window.
export function isWithinReturnWindow(order: Order): boolean {
  if (order.status !== 'delivered' || !order.delivered_at) return false;
  const deadline = new Date(order.delivered_at).getTime() + RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() <= deadline;
}
