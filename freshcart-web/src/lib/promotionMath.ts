import { FREE_DELIVERY_THRESHOLD, DELIVERY_FEE, type ActivePromotion, type PublicOffer } from '@freshcart/types';
import type { AppliedPromotion, CartItem } from './store';

function getMatchingItems(promotion: ActivePromotion, items: CartItem[]): CartItem[] {
  if (promotion.applicable_scope === 'cart') return items;
  const idSet = new Set(promotion.applicable_ids || []);
  return items.filter((item) =>
    idSet.has(promotion.applicable_scope === 'category' ? (item.categoryId ?? '') : item.productId)
  );
}

// Client-side mirror of the backend's tier-selection logic (see computeTieredDiscount
// in freshcart-backend/lib/promotions.js) — highest qualifying tier wins, gated on
// whole-cart subtotal same as every other min_order_value in this file.
function estimateTieredDiscount(promotion: ActivePromotion, eligibleAmount: number, subtotal: number): number {
  const qualifying = (promotion.tiers || []).filter((t) => subtotal >= t.min_order_value);
  if (qualifying.length === 0) return 0;
  const tier = qualifying.reduce((best, t) => (t.min_order_value > best.min_order_value ? t : best));
  return tier.discount_type === 'percentage' ? (eligibleAmount * tier.discount_value) / 100 : tier.discount_value;
}

// Client-side estimate of what a promotion would discount, used ONLY for pre-checkout
// display (badges, auto-apply preview banners). It is never authoritative — the real
// discount is always recomputed server-side in /api/coupons/validate and at order
// placement, which is why this mirrors (rather than shares) the backend's
// freshcart-backend/lib/promotions.js computeDiscountForCart.
export function estimateDiscount(promotion: ActivePromotion, items: CartItem[], subtotal: number): number {
  // Mirrors the backend: free_shipping never discounts items, it waives the delivery
  // fee. The value here is only used for ranking against other offers/coupons and for
  // display — 0 if the cart already qualifies for free delivery on its own.
  if (promotion.discount_type === 'free_shipping') {
    return subtotal > 0 && subtotal < FREE_DELIVERY_THRESHOLD ? DELIVERY_FEE : 0;
  }
  // Mirrors the backend: gift_with_purchase never discounts items either — it adds a
  // free product instead. The gift's price is only used for ranking/display here.
  if (promotion.discount_type === 'gift_with_purchase') {
    return promotion.gift_product?.price ?? 0;
  }

  const matchingItems = getMatchingItems(promotion, items);
  const eligibleAmount = promotion.applicable_scope === 'cart'
    ? subtotal
    : matchingItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (eligibleAmount <= 0) return 0;

  let discount: number;
  if (promotion.tiers?.length) {
    discount = estimateTieredDiscount(promotion, eligibleAmount, subtotal);
  } else if (promotion.discount_type === 'flat') {
    discount = promotion.discount_value;
  } else if (promotion.discount_type === 'percentage') {
    discount = (eligibleAmount * promotion.discount_value) / 100;
  } else {
    discount = matchingItems.length > 0 ? Math.min(...matchingItems.map((item) => item.price)) : 0;
  }

  if (promotion.max_discount_amount != null) discount = Math.min(discount, promotion.max_discount_amount);
  return Math.min(discount, eligibleAmount, subtotal);
}

// The cart item a BOGO promotion would make free (the cheapest matching item,
// same rule estimateDiscount uses to price it) — used to name the free item
// in the auto-offer preview banner and checkout attribution line.
export function findBogoFreeItem(promotion: ActivePromotion, items: CartItem[]): CartItem | null {
  const matchingItems = getMatchingItems(promotion, items);
  if (matchingItems.length === 0) return null;
  return matchingItems.reduce((cheapest, item) => (item.price < cheapest.price ? item : cheapest));
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

// Attribution label for the checkout discount line, e.g. "10% off (code
// WELCOME10)" or "₹100 off (auto-applied: Diwali Sale)" — so once multiple
// promotions can be active at once (see selectBestPromotion in the backend),
// it's always clear to the shopper (and support) which one actually applied.
export function formatDiscountAttribution(promo: AppliedPromotion): string {
  const source = promo.source === 'coupon' ? `code ${promo.code}` : `auto-applied: ${promo.name}`;
  if (promo.discountType === 'free_shipping') return `Free delivery (${source})`;
  if (promo.discountType === 'gift_with_purchase') {
    return `${promo.freeItemName ? `Free gift: ${promo.freeItemName}` : 'Free gift'} (${source})`;
  }
  const valueLabel =
    promo.discountType === 'percentage' ? `${promo.discountValue}% off`
    : promo.discountType === 'bogo'
      ? (promo.freeItemName ? `Buy One Get One — ${promo.freeItemName} free` : 'Buy One Get One off')
    : `₹${promo.discountValue} off`;
  return `${valueLabel} (${source})`;
}

export interface ThresholdNudge {
  gap: number; // ₹ short of the threshold
  progress: number; // 0-100, for a progress bar
  text: string; // appended after "Add ₹{gap} more ", e.g. "for FREE delivery" or "to unlock 10% off!"
  isFreeDelivery: boolean;
}

// Cart nudges only bother the shopper when the gap is close enough to plausibly change
// their mind — far above this and it reads as noise, not motivation.
const NUDGE_MAX_GAP = 150;

// The single nearest not-yet-met spend threshold worth nudging about — either the
// site-wide free-delivery threshold or an active no-code offer's min_order_value,
// whichever the shopper is closest to unlocking. Generalizes the free-delivery-only
// nudge to any threshold-gated offer (e.g. "Add ₹80 more to unlock 10% off!"), so the
// cart/checkout screens only need to render one nudge slot instead of one per threshold.
//
// skipFreeDelivery: pass true when a free_shipping promotion is already applied —
// delivery is already free via the promotion, so nudging toward the ₹ threshold too
// would tell the shopper to spend more for something they've already got for free.
export function nearestThresholdNudge(offers: ActivePromotion[], subtotal: number, skipFreeDelivery = false): ThresholdNudge | null {
  let best: ThresholdNudge | null = null;

  const consider = (minOrderValue: number, text: string, isFreeDelivery: boolean) => {
    const gap = minOrderValue - subtotal;
    if (gap <= 0 || gap > NUDGE_MAX_GAP) return;
    if (best && gap >= best.gap) return;
    best = { gap, progress: Math.min(100, (subtotal / minOrderValue) * 100), text, isFreeDelivery };
  };

  if (!skipFreeDelivery) consider(FREE_DELIVERY_THRESHOLD, 'for FREE delivery', true);
  for (const offer of offers) {
    // free_shipping offers waive the same delivery fee the threshold above already
    // nudges toward — nudging twice for the same reward would be confusing, not helpful.
    if (offer.discount_type === 'free_shipping') continue;
    if (offer.tiers?.length) {
      // Nudge toward the lowest not-yet-met tier, not the top one — that's the
      // shopper's actual next unlock, not the aspirational best case.
      const nextTier = offer.tiers
        .filter((t) => t.min_order_value > subtotal)
        .reduce((lowest: typeof offer.tiers[number] | null, t) => (!lowest || t.min_order_value < lowest.min_order_value ? t : lowest), null);
      if (!nextTier) continue;
      const text = nextTier.discount_type === 'percentage'
        ? `to unlock ${nextTier.discount_value}% off!`
        : `to unlock ₹${nextTier.discount_value} off!`;
      consider(nextTier.min_order_value, text, false);
      continue;
    }
    if (!offer.min_order_value) continue;
    const text =
      offer.discount_type === 'percentage' ? `to unlock ${offer.discount_value}% off!`
      : offer.discount_type === 'bogo' ? 'to unlock a free item!'
      : offer.discount_type === 'gift_with_purchase'
        ? (offer.gift_product?.name ? `to unlock a free ${offer.gift_product.name}!` : 'to unlock a free gift!')
      : `to unlock ₹${offer.discount_value} off!`;
    consider(offer.min_order_value, text, false);
  }
  return best;
}

// The single "best" offer to feature in the homepage banner. Percentage and flat
// discounts rank by their stated value (directly comparable in their own terms — 20%
// off reads as bigger than 10% off, ₹100 off reads as bigger than ₹50 off); BOGO and
// free_shipping get a nominal score since they have no single ₹ figure to rank by.
// This is a marketing pick, not a cart-specific calculation — see selectBestPromotion
// in the backend for the authoritative per-cart comparison used at checkout.
export function pickFeaturedOffer(offers: PublicOffer[]): PublicOffer | null {
  if (offers.length === 0) return null;
  const score = (offer: PublicOffer) => {
    if (offer.tiers?.length) return Math.max(...offer.tiers.map((t) => t.discount_value));
    if (offer.discount_type === 'percentage' || offer.discount_type === 'flat') return offer.discount_value;
    if (offer.discount_type === 'bogo') return 25;
    if (offer.discount_type === 'gift_with_purchase') return 20;
    return 15; // free_shipping
  };
  return offers.reduce((best, offer) => (score(offer) > score(best) ? offer : best), offers[0]);
}

// A short "what you get" headline for an offer card on /offers or the homepage
// banner, e.g. "10% off your order", "Buy One Get One Free", "Free delivery".
export function formatOfferHeadline(offer: PublicOffer): string {
  if (offer.discount_type === 'free_shipping') return 'Free delivery';
  if (offer.discount_type === 'bogo') return 'Buy One Get One Free';
  if (offer.discount_type === 'gift_with_purchase') {
    return offer.gift_product?.name ? `Free ${offer.gift_product.name} with your order` : 'Free gift with your order';
  }
  if (offer.tiers?.length) {
    const best = offer.tiers.reduce((b, t) => (t.discount_value > b.discount_value ? t : b));
    return best.discount_type === 'percentage' ? `Up to ${best.discount_value}% off your order` : `Up to ₹${best.discount_value} off your order`;
  }
  if (offer.discount_type === 'percentage') return `${offer.discount_value}% off your order`;
  return `₹${offer.discount_value} off your order`;
}

// The condition line under the headline, e.g. "Min. order ₹500 · Max discount ₹200" —
// null when the offer has no conditions worth stating.
export function formatOfferConditions(offer: PublicOffer): string | null {
  const parts: string[] = [];
  if (offer.min_order_value) parts.push(`Min. order ₹${offer.min_order_value}`);
  if (offer.max_discount_amount) parts.push(`Max discount ₹${offer.max_discount_amount}`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

// The best active offer scoped to a given category — used for the "🔥 10% off
// Beverages — auto-applied at checkout" banner shown while browsing that category, so
// shoppers understand why items might already look discounted and are encouraged to
// add more qualifying items.
export function findCategoryOffer(categoryId: string, offers: ActivePromotion[]): ActivePromotion | null {
  let best: ActivePromotion | null = null;
  for (const offer of offers) {
    if (offer.applicable_scope !== 'category') continue;
    if (!(offer.applicable_ids || []).includes(categoryId)) continue;
    if (!best || offer.discount_value > best.discount_value) best = offer;
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
