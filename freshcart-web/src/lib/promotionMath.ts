import type { ActivePromotion } from '@freshcart/types';
import type { CartItem } from './store';

// Client-side estimate of what a promotion would discount, used ONLY for pre-checkout
// display (badges, auto-apply preview banners). It is never authoritative — the real
// discount is always recomputed server-side in /api/coupons/validate and at order
// placement, which is why this mirrors (rather than shares) the backend's
// freshcart-backend/lib/promotions.js computeDiscountForCart.
export function estimateDiscount(promotion: ActivePromotion, items: CartItem[], subtotal: number): number {
  let eligibleAmount: number;
  let matchingItems: CartItem[];

  if (promotion.applicable_scope === 'cart') {
    eligibleAmount = subtotal;
    matchingItems = items;
  } else {
    const idSet = new Set(promotion.applicable_ids || []);
    matchingItems = items.filter((item) =>
      idSet.has(promotion.applicable_scope === 'category' ? (item.categoryId ?? '') : item.productId)
    );
    eligibleAmount = matchingItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }
  if (eligibleAmount <= 0) return 0;

  let discount: number;
  if (promotion.discount_type === 'flat') {
    discount = promotion.discount_value;
  } else if (promotion.discount_type === 'percentage') {
    discount = (eligibleAmount * promotion.discount_value) / 100;
  } else {
    discount = matchingItems.length > 0 ? Math.min(...matchingItems.map((item) => item.price)) : 0;
  }

  if (promotion.max_discount_amount != null) discount = Math.min(discount, promotion.max_discount_amount);
  return Math.min(discount, eligibleAmount, subtotal);
}

// Whether an active promotion matches this cart at all right now (used to decide
// whether it's worth showing/auto-applying), independent of the discount amount.
export function promotionMeetsMinimum(promotion: ActivePromotion, subtotal: number): boolean {
  return subtotal >= (promotion.min_order_value ?? 0);
}

export function bestAutoOffer(offers: ActivePromotion[], items: CartItem[], subtotal: number) {
  let best: { promotion: ActivePromotion; amount: number } | null = null;
  for (const offer of offers) {
    if (!promotionMeetsMinimum(offer, subtotal)) continue;
    const amount = estimateDiscount(offer, items, subtotal);
    if (amount > (best?.amount ?? 0)) best = { promotion: offer, amount };
  }
  return best;
}

// For product-grid badges: only category/product-scoped offers badge a card — a
// cart-wide offer applies to everything, so badging every single card for it would be
// noisy without telling the shopper anything product-specific (it's surfaced via the
// cart summary/banner instead).
export function findBestProductMatch(
  product: { id: string; categoryId: string | null },
  offers: ActivePromotion[],
): ActivePromotion | null {
  let best: ActivePromotion | null = null;
  for (const offer of offers) {
    if (offer.applicable_scope === 'cart') continue;
    const idSet = new Set(offer.applicable_ids || []);
    const matches = offer.applicable_scope === 'category'
      ? (product.categoryId != null && idSet.has(product.categoryId))
      : idSet.has(product.id);
    if (!matches) continue;
    if (!best || offer.discount_value > best.discount_value) best = offer;
  }
  return best;
}
