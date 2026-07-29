const { supabaseAdmin } = require('../supabaseClient');

// Compute the discount a promotion contributes for a given cart, in currency units,
// already capped by max_discount_amount and by the eligible amount itself. Returns 0
// if the promotion's scope doesn't match anything in the cart.
//
// cartItems: [{ product_id, category_id, quantity, price }] — price is the
// authoritative unit price (never trust a client-supplied price).
function computeDiscountForCart(promotion, cartItems, cartSubtotal) {
  let eligibleAmount;
  let matchingItems;
  if (promotion.applicable_scope === 'cart') {
    eligibleAmount = cartSubtotal;
    matchingItems = cartItems;
  } else {
    const idSet = new Set(promotion.applicable_ids || []);
    const matchKey = promotion.applicable_scope === 'category' ? 'category_id' : 'product_id';
    matchingItems = cartItems.filter((item) => idSet.has(item[matchKey]));
    eligibleAmount = matchingItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }
  if (eligibleAmount <= 0) return 0;

  let discount;
  if (promotion.discount_type === 'flat') {
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

function isWithinValidity(promotion, now = new Date()) {
  const from = new Date(promotion.valid_from);
  const until = promotion.valid_until ? new Date(promotion.valid_until) : null;
  return now >= from && (!until || now <= until);
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

module.exports = { computeDiscountForCart, isWithinValidity, underUsageLimits };
