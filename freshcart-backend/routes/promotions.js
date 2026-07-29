const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../supabaseClient');
const { requireAuth } = require('../middleware/auth');
const { PromotionValidationRequestSchema } = require('@freshcart/types');
const { computeDiscountForCart, isWithinValidity, underUsageLimits } = require('../lib/promotions');

// GET /api/promotions/active — currently active auto-offers (no code required), for
// rendering product badges and auto-applying to carts. No auth required.
router.get('/promotions/active', async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('promotions')
      .select('id, name, discount_type, discount_value, min_order_value, max_discount_amount, applicable_scope, applicable_ids, valid_from, valid_until')
      .eq('requires_code', false)
      .eq('is_active', true);
    if (error) throw error;

    const active = (data || []).filter((p) => isWithinValidity(p));
    res.json(active);
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
    if (cart_subtotal < (promotion.min_order_value ?? 0)) {
      return res.json({ valid: false, error_message: `Minimum order of ₹${promotion.min_order_value} required.` });
    }
    if (!(await underUsageLimits(promotion, req.user.id))) {
      return res.json({ valid: false, error_message: 'This coupon is no longer available to you.' });
    }

    // Look up authoritative price/category for each cart item — never trust
    // client-supplied prices when computing the discount.
    const productIds = [...new Set(cart_items.map((item) => item.product_id))];
    const { data: products, error: prodErr } = await supabaseAdmin
      .from('products')
      .select('id, price, category_id')
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
      }));

    const discount_amount = computeDiscountForCart(promotion, itemsWithPrice, cart_subtotal);
    if (discount_amount <= 0) {
      return res.json({ valid: false, error_message: 'This coupon does not apply to the items in your cart.' });
    }

    res.json({ valid: true, discount_amount, promotion_name: promotion.name, promotion_id: promotion.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
