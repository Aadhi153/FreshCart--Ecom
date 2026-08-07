const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../supabaseClient');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { PromotionValidationRequestSchema } = require('@freshcart/types');
const {
  computeDiscountForCart,
  isWithinValidity,
  underUsageLimits,
  meetsMinimumOrder,
  bogoFreeItem,
  giftProductDetails,
  getUserEligibilityContext,
  meetsFirstOrderRequirement,
  matchesTargetSegment,
} = require('../lib/promotions');

// Resolves and attaches `.gift_product` onto every gift_with_purchase promotion in the
// list (a no-op, no extra query, if none are gift_with_purchase) — shared by both
// public list endpoints below so the client can rank/display a gift offer without a
// second round-trip per offer.
async function attachGiftProducts(promotions) {
  const giftProductIds = [...new Set(
    promotions.filter((p) => p.discount_type === 'gift_with_purchase' && p.gift_product_id).map((p) => p.gift_product_id)
  )];
  if (giftProductIds.length === 0) return promotions.map((p) => ({ ...p, gift_product: null }));
  const { data: giftProducts, error } = await supabaseAdmin
    .from('products')
    .select('id, name, price, stock_quantity')
    .in('id', giftProductIds);
  if (error) throw error;
  const productsById = new Map((giftProducts || []).map((p) => [p.id, p]));
  return promotions.map((p) => ({ ...p, gift_product: giftProductDetails(p, productsById) }));
}

// GET /api/promotions/active — currently active auto-offers (no code required), for
// rendering product badges and auto-applying to carts. Optionally authenticated: a
// logged-in shopper only sees offers they'd actually qualify for at checkout
// (first_order_only/target_segment) — otherwise an offer could auto-apply here and then
// silently vanish at order placement, a bait-and-switch a guest/logged-out session
// can't be personalized against, so those two offer types are hidden entirely for them.
router.get('/promotions/active', optionalAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('promotions')
      .select('id, name, discount_type, discount_value, min_order_value, max_discount_amount, applicable_scope, applicable_ids, valid_from, valid_until, tiers, first_order_only, target_segment, recurrence, gift_product_id')
      .eq('requires_code', false)
      .eq('is_active', true);
    if (error) throw error;

    let candidates = (data || []).filter((p) => isWithinValidity(p));

    if (req.user) {
      const context = await getUserEligibilityContext(req.user.id);
      candidates = candidates.filter((p) => meetsFirstOrderRequirement(p, context) && matchesTargetSegment(p, context));
    } else {
      candidates = candidates.filter((p) => p.target_segment === 'all' && !p.first_order_only);
    }

    const withGifts = await attachGiftProducts(candidates);
    const active = withGifts.map(({ first_order_only, target_segment, recurrence, gift_product_id, ...p }) => p);
    res.json(active);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/promotions/offers — the customer-browsable list for the /offers page and
// homepage banner: every active auto-offer (they have no code to keep secret, so
// there's nothing to gate) plus coupons the admin has explicitly marked is_public.
// No auth required — this is marketing surface, shown to logged-out shoppers too.
// Deliberately not personalized by segment/first-order (unlike /promotions/active
// above) — it's a static "here's what's on offer" listing, not something that
// auto-applies to a cart, so there's no bait-and-switch risk in showing it broadly.
router.get('/promotions/offers', async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('promotions')
      .select('id, name, description, code, requires_code, discount_type, discount_value, min_order_value, max_discount_amount, applicable_scope, valid_from, valid_until, tiers, gift_product_id, target_segment')
      .eq('is_active', true)
      .or('requires_code.eq.false,is_public.eq.true');
    if (error) throw error;

    const eligible = (data || []).filter((p) => isWithinValidity(p));
    const withGifts = await attachGiftProducts(eligible);
    const offers = withGifts.map(({ valid_from, gift_product_id, ...offer }) => offer);
    res.json(offers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// How many days past valid_until a promotion still counts as "recently expired" for
// the teaser grid below — long enough to still be relevant marketing ("that flash
// sale just ended"), short enough that it doesn't clutter the page with stale offers.
const RECENTLY_EXPIRED_DAYS = 14;

// GET /api/promotions/teasers — public promotions that are scheduled to start soon
// (valid_from in the future) or ended within the last RECENTLY_EXPIRED_DAYS days.
// Feeds the dashed "teaser" cards on the account "Coupons & Rewards" page. No auth
// required and not personalized, same rationale as /promotions/offers above — this
// is a static marketing listing, not something that auto-applies to a cart.
router.get('/promotions/teasers', async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('promotions')
      .select('id, name, description, discount_type, valid_from, valid_until')
      .eq('is_active', true)
      .or('requires_code.eq.false,is_public.eq.true');
    if (error) throw error;

    const now = Date.now();
    const recentCutoff = now - RECENTLY_EXPIRED_DAYS * 24 * 60 * 60 * 1000;

    const teasers = (data || [])
      .map((p) => {
        const from = new Date(p.valid_from).getTime();
        const until = p.valid_until ? new Date(p.valid_until).getTime() : null;
        if (from > now) return { ...p, status: 'upcoming' };
        if (until != null && until < now && until >= recentCutoff) return { ...p, status: 'expired' };
        return null;
      })
      .filter(Boolean);

    res.json(teasers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/coupons/validate — server-side single source of truth for coupon
// validity. Never trust a client-calculated discount.
router.post('/coupons/validate', requireAuth, async (req, res) => {
  try {
    const validationResult = PromotionValidationRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Validation failed', details: validationResult.error.issues });
    }
    const { code, cart_items, cart_subtotal } = validationResult.data;

    const { data: promotion } = await supabaseAdmin
      .from('promotions')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('requires_code', true)
      .maybeSingle();

    if (!promotion || !promotion.is_active) {
      return res.json({ valid: false, error_message: 'Invalid coupon code.' });
    }
    if (!isWithinValidity(promotion)) {
      return res.json({ valid: false, error_message: 'This coupon has expired.' });
    }
    if (!meetsMinimumOrder(promotion, cart_subtotal)) {
      return res.json({ valid: false, error_message: `Minimum order of ₹${promotion.min_order_value} required.` });
    }
    if (!(await underUsageLimits(promotion, req.user.id))) {
      return res.json({ valid: false, error_message: 'This coupon is no longer available to you.' });
    }

    const eligibilityContext = await getUserEligibilityContext(req.user.id);
    if (!meetsFirstOrderRequirement(promotion, eligibilityContext)) {
      return res.json({ valid: false, error_message: 'This coupon is only valid on your first order.' });
    }
    if (!matchesTargetSegment(promotion, eligibilityContext)) {
      return res.json({ valid: false, error_message: 'This coupon is not available for your account.' });
    }

    // Look up authoritative price/category for each cart item — never trust
    // client-supplied prices when computing the discount.
    const productIds = [...new Set(cart_items.map((item) => item.product_id))];
    const { data: products, error: prodErr } = await supabaseAdmin
      .from('products')
      .select('id, name, price, category_id')
      .in('id', productIds);
    if (prodErr) throw prodErr;
    const productById = new Map(products.map((p) => [p.id, p]));

    const itemsWithPrice = cart_items
      .filter((item) => productById.has(item.product_id))
      .map((item) => ({
        product_id: item.product_id,
        category_id: productById.get(item.product_id).category_id,
        quantity: item.quantity,
        price: productById.get(item.product_id).price,
        name: productById.get(item.product_id).name,
      }));

    if (promotion.discount_type === 'gift_with_purchase' && promotion.gift_product_id) {
      const { data: giftProducts, error: giftErr } = await supabaseAdmin
        .from('products')
        .select('id, name, price, stock_quantity')
        .eq('id', promotion.gift_product_id);
      if (giftErr) throw giftErr;
      promotion.gift_product = giftProductDetails(promotion, new Map((giftProducts || []).map((p) => [p.id, p])));
    }

    const discount_amount = computeDiscountForCart(promotion, itemsWithPrice, cart_subtotal);
    if (discount_amount <= 0 && promotion.discount_type !== 'gift_with_purchase') {
      return res.json({ valid: false, error_message: 'This coupon does not apply to the items in your cart.' });
    }

    res.json({
      valid: true,
      discount_amount,
      promotion_name: promotion.name,
      promotion_id: promotion.id,
      discount_type: promotion.discount_type,
      discount_value: promotion.discount_value,
      free_item_name: promotion.discount_type === 'bogo' ? bogoFreeItem(promotion, itemsWithPrice)?.name : undefined,
      gift_item_name: promotion.discount_type === 'gift_with_purchase' ? promotion.gift_product?.name : undefined,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
