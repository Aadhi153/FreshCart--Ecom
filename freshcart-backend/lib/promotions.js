const { supabaseAdmin } = require('../supabaseClient');
const { FREE_DELIVERY_THRESHOLD, DELIVERY_FEE } = require('@freshcart/types');

// cartItems: [{ product_id, category_id, quantity, price, name? }] — price is
// the authoritative unit price (never trust a client-supplied price); name is
// optional and only needed by bogoFreeItem below (display purposes).
function getMatchingItems(promotion, cartItems) {
  if (promotion.applicable_scope === 'cart') return cartItems;
  const idSet = new Set(promotion.applicable_ids || []);
  const matchKey = promotion.applicable_scope === 'category' ? 'category_id' : 'product_id';
  return cartItems.filter((item) => idSet.has(item[matchKey]));
}

// Resolves a promotion's tiers ladder to the single discount amount the highest
// qualifying tier gives, using the same eligible-amount/min-order semantics as the
// flat/percentage branches below. min_order_value on each tier is checked against the
// whole-cart subtotal (same as the top-level min_order_value everywhere else in this
// file), not the scope-matched eligibleAmount, so a tier promotion scoped to a category
// still gates on total cart spend. Returns 0 if the cart doesn't meet even the lowest
// tier (callers should already have filtered this via meetsMinimumOrder).
function computeTieredDiscount(promotion, eligibleAmount, cartSubtotal) {
  const qualifying = (promotion.tiers || []).filter((t) => cartSubtotal >= t.min_order_value);
  if (qualifying.length === 0) return 0;
  const tier = qualifying.reduce((best, t) => (t.min_order_value > best.min_order_value ? t : best));
  return tier.discount_type === 'percentage' ? (eligibleAmount * tier.discount_value) / 100 : tier.discount_value;
}

// Compute the discount a promotion contributes for a given cart, in currency units,
// already capped by max_discount_amount and by the eligible amount itself. Returns 0
// if the promotion's scope doesn't match anything in the cart.
function computeDiscountForCart(promotion, cartItems, cartSubtotal) {
  // free_shipping never discounts cart items — it waives the delivery fee instead
  // (applied separately in orders.js). The value returned here exists only so
  // selectBestPromotion can rank it fairly against a flat/percentage/bogo discount:
  // it's the delivery fee this cart would otherwise pay, or 0 if the cart already
  // qualifies for free delivery on its own (waiving it again adds no value).
  if (promotion.discount_type === 'free_shipping') {
    return cartSubtotal > 0 && cartSubtotal < FREE_DELIVERY_THRESHOLD ? DELIVERY_FEE : 0;
  }

  // gift_with_purchase never discounts cart items either — it adds a free product
  // instead (injected as an extra order_item in orders.js, never a real cart line —
  // see usePromotion.ts). The gift's price is returned here purely so selectBestPromotion
  // can rank it against a flat/percentage/bogo discount in comparable currency terms;
  // the caller is responsible for zeroing discount_amount and injecting the gift itself,
  // exactly like it already does for free_shipping. Requires the caller to have attached
  // `gift_product` (via giftProductDetails) before calling this function.
  if (promotion.discount_type === 'gift_with_purchase') {
    return promotion.gift_product?.price ?? 0;
  }

  const matchingItems = getMatchingItems(promotion, cartItems);
  const eligibleAmount = promotion.applicable_scope === 'cart'
    ? cartSubtotal
    : matchingItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (eligibleAmount <= 0) return 0;

  let discount;
  if (promotion.tiers?.length) {
    // Tiers replace the top-level discount_type/discount_value entirely when present.
    discount = computeTieredDiscount(promotion, eligibleAmount, cartSubtotal);
  } else if (promotion.discount_type === 'flat') {
    discount = promotion.discount_value;
  } else if (promotion.discount_type === 'percentage') {
    discount = (eligibleAmount * promotion.discount_value) / 100;
  } else {
    // 'bogo' — v1 semantics: the single cheapest matching item is free. Not otherwise
    // specified; revisit if a richer "buy X get Y" model is needed later.
    discount = matchingItems.length > 0 ? Math.min(...matchingItems.map((item) => item.price)) : 0;
  }

  if (promotion.max_discount_amount != null) discount = Math.min(discount, promotion.max_discount_amount);
  return Math.min(discount, eligibleAmount, cartSubtotal);
}

// The cart item a BOGO promotion would make free (the cheapest matching
// item — same rule computeDiscountForCart uses to price it), or null if
// nothing matches. Used to name the free item in customer-facing display.
function bogoFreeItem(promotion, cartItems) {
  const matchingItems = getMatchingItems(promotion, cartItems);
  if (matchingItems.length === 0) return null;
  return matchingItems.reduce((cheapest, item) => (item.price < cheapest.price ? item : cheapest));
}

// The product a gift_with_purchase promotion gives away, resolved from a pre-fetched
// product map (never trust a client-supplied price/stock for this — callers must
// fetch products by promotion.gift_product_id themselves, same as every other
// authoritative price lookup in this codebase). Returns null if the promotion isn't
// gift_with_purchase or the configured product can't be found (e.g. deleted — though
// the 00024 migration's trigger already deactivates the promotion in that case).
function giftProductDetails(promotion, productsById) {
  if (!promotion.gift_product_id) return null;
  const product = productsById.get(promotion.gift_product_id);
  if (!product) return null;
  return { id: product.id, name: product.name, price: product.price, stock_quantity: product.stock_quantity };
}

// Eligibility must always be checked against the cart's pre-discount subtotal,
// never re-checked after a discount is subtracted (a discount could otherwise
// push an order below the very threshold that qualified it). Every caller
// (orders.js coupon/auto-offer eligibility, /api/coupons/validate) passes the
// pre-discount subtotal here — this is the single place that contract lives.
function meetsMinimumOrder(promotion, preDiscountSubtotal) {
  if (promotion.tiers?.length) {
    const lowestTierThreshold = Math.min(...promotion.tiers.map((t) => t.min_order_value));
    return preDiscountSubtotal >= lowestTierThreshold;
  }
  return preDiscountSubtotal >= (promotion.min_order_value ?? 0);
}

// Maps Intl's short weekday name to the 0-6 (Sunday-first) index used by
// PromotionRecurrenceSchema and Date#getDay(), so recurrence is evaluated
// consistently regardless of which one produced the number.
const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const RECURRENCE_TIMEZONE = 'Asia/Kolkata';

function isWithinValidity(promotion, now = new Date()) {
  const from = new Date(promotion.valid_from);
  const until = promotion.valid_until ? new Date(promotion.valid_until) : null;
  if (!(now >= from && (!until || now <= until))) return false;

  // recurrence auto-activates a promotion only on a matching weekday, computed live
  // against India local time (not UTC/server-local) since there's no scheduler in this
  // repo to flip is_active on a schedule instead (see 00021's migration comment).
  if (promotion.recurrence?.day_of_week != null) {
    const weekdayName = new Intl.DateTimeFormat('en-US', { timeZone: RECURRENCE_TIMEZONE, weekday: 'short' }).format(now);
    if (WEEKDAY_INDEX[weekdayName] !== promotion.recurrence.day_of_week) return false;
  }

  return true;
}

// FreshCart promotions never stack — exactly one promotion applies per order,
// whichever yields the larger discount. This is a deliberate v1 product
// decision, not a limitation to work around: if a coupon and an auto-offer are
// both eligible, only the bigger of the two discounts is applied, never both.
//
// coupon/autoOffers must already be filtered down to *eligible* candidates
// (active, within validity, min order met, under usage limits) — this function
// only decides which single one wins, it doesn't re-check eligibility.
function selectBestPromotion({ coupon, autoOffers, cartItems, cartSubtotal }) {
  let best = null;
  if (coupon) {
    const amount = computeDiscountForCart(coupon, cartItems, cartSubtotal);
    if (amount > 0) best = { id: coupon.id, name: coupon.name, amount, discount_type: coupon.discount_type, gift_product: coupon.gift_product ?? null };
  }
  for (const offer of autoOffers || []) {
    const amount = computeDiscountForCart(offer, cartItems, cartSubtotal);
    if (amount > (best?.amount ?? 0)) best = { id: offer.id, name: offer.name, amount, discount_type: offer.discount_type, gift_product: offer.gift_product ?? null };
  }
  return best;
}

// One request-scoped snapshot of everything needed to evaluate first_order_only/
// target_segment for a given user, fetched once and threaded through every candidate
// promotion's eligibility check — never re-queried per promotion (would be an N+1
// query per coupon/auto-offer otherwise). "Completed order" here means any
// non-cancelled order, not specifically "delivered" — this is about whether someone is
// a returning customer, not fulfillment status.
async function getUserEligibilityContext(userId) {
  const [{ data: profile }, { data: recentOrders }] = await Promise.all([
    supabaseAdmin.from('profiles').select('is_vip, referred_by, date_of_birth').eq('id', userId).maybeSingle(),
    supabaseAdmin
      .from('orders')
      .select('created_at')
      .eq('user_id', userId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1),
  ]);
  const lastOrder = recentOrders?.[0];
  return {
    isVip: profile?.is_vip ?? false,
    referredBy: profile?.referred_by ?? null,
    hasOrderedBefore: !!lastOrder,
    lastOrderAt: lastOrder?.created_at ?? null,
    dateOfBirth: profile?.date_of_birth ?? null,
  };
}

function meetsFirstOrderRequirement(promotion, context) {
  return !promotion.first_order_only || !context.hasOrderedBefore;
}

const INACTIVE_SEGMENT_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000;

// A customer is in their "birthday month" when today's calendar month (in India local
// time, same RECURRENCE_TIMEZONE used for recurrence.day_of_week below) matches the
// month of their self-reported date_of_birth. Month-wide rather than exact-day so a
// customer doesn't lose the offer just for not opening the app on the exact date; the
// year of date_of_birth is irrelevant, only the month is compared.
function isBirthdayMonth(dateOfBirth, now = new Date()) {
  if (!dateOfBirth) return false;
  const dobMonth = Number(String(dateOfBirth).slice(5, 7));
  const nowMonth = Number(new Intl.DateTimeFormat('en-US', { timeZone: RECURRENCE_TIMEZONE, month: 'numeric' }).format(now));
  return dobMonth === nowMonth;
}

function matchesTargetSegment(promotion, context, now = new Date()) {
  switch (promotion.target_segment) {
    case 'vip':
      return context.isVip;
    case 'referral':
      return context.referredBy != null;
    case 'inactive_30_days':
      return !context.lastOrderAt || now - new Date(context.lastOrderAt) > INACTIVE_SEGMENT_THRESHOLD_MS;
    case 'birthday':
      return isBirthdayMonth(context.dateOfBirth, now);
    case 'all':
    default:
      return true;
  }
}

async function underUsageLimits(promotion, userId) {
  if (promotion.usage_limit_total != null) {
    const { count } = await supabaseAdmin
      .from('promotion_redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('promotion_id', promotion.id);
    if ((count ?? 0) >= promotion.usage_limit_total) return false;
  }
  if (promotion.usage_limit_per_user != null) {
    const { count } = await supabaseAdmin
      .from('promotion_redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('promotion_id', promotion.id)
      .eq('user_id', userId);
    if ((count ?? 0) >= promotion.usage_limit_per_user) return false;
  }
  return true;
}

module.exports = {
  computeDiscountForCart,
  isWithinValidity,
  underUsageLimits,
  selectBestPromotion,
  meetsMinimumOrder,
  bogoFreeItem,
  giftProductDetails,
  getUserEligibilityContext,
  meetsFirstOrderRequirement,
  matchesTargetSegment,
};
