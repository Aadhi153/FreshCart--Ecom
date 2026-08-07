const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../supabaseClient');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { UpdateReviewPayloadSchema } = require('@freshcart/types');

const MY_REVIEW_SELECT = '*, products(name, image_url)';

// GET /api/reviews/mine — the caller's own submitted reviews, plus "pending"
// reviews: distinct products from their delivered orders that don't have a
// review yet. A review is unique per (product_id, user_id) regardless of which
// order it came from, so pending products are deduped the same way.
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const { data: reviews, error: reviewsErr } = await supabaseAdmin
      .from('reviews')
      .select(MY_REVIEW_SELECT)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
    if (reviewsErr) throw reviewsErr;

    const { data: orders, error: ordersErr } = await supabaseAdmin
      .from('orders')
      .select('id, order_items(id, product_id, is_gift, products(name, image_url))')
      .eq('user_id', req.user.id)
      .eq('status', 'delivered');
    if (ordersErr) throw ordersErr;

    const reviewedProductIds = new Set((reviews || []).map((r) => r.product_id));
    const seenProductIds = new Set();
    // Distinct delivered products already reviewed — dedup separately from
    // reviewedProductIds, since a review could exist for a product this user
    // never actually had delivered (e.g. a since-cancelled order).
    const reviewedDeliveredProductIds = new Set();
    // First delivered order that contained each product — lets a review card
    // link back ("View order") to where it was actually purchased.
    const orderIdByProductId = new Map();
    const pending = [];
    for (const order of orders || []) {
      for (const item of order.order_items || []) {
        if (item.is_gift || !item.product_id) continue;
        if (!orderIdByProductId.has(item.product_id)) orderIdByProductId.set(item.product_id, order.id);
        if (reviewedProductIds.has(item.product_id)) {
          reviewedDeliveredProductIds.add(item.product_id);
          continue;
        }
        if (seenProductIds.has(item.product_id)) continue;
        seenProductIds.add(item.product_id);
        pending.push({
          order_item_id: item.id,
          product_id: item.product_id,
          product_name: item.products?.name || 'Item',
          image_url: item.products?.image_url || null,
        });
      }
    }

    const reviewsWithOrder = (reviews || []).map((r) => ({
      ...r,
      order_id: orderIdByProductId.get(r.product_id) || null,
    }));

    res.json({
      reviews: reviewsWithOrder,
      pending,
      // "Rated X of Y delivered items" — powers the review-progress nudge on Orders.
      deliveredRatedCount: reviewedDeliveredProductIds.size,
      deliveredTotalCount: reviewedDeliveredProductIds.size + pending.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/reviews/:id — owner only: edit your own rating/comment. The
// reviews trigger (trg_update_product_rating, 00004) recomputes products.rating/
// review_count on UPDATE too, so the shop page's aggregate stays in sync for free.
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const validationResult = UpdateReviewPayloadSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Validation failed', details: validationResult.error.issues });
    }
    const { rating, comment } = validationResult.data;

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('reviews')
      .select('id, user_id')
      .eq('id', req.params.id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!existing || existing.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const { data, error } = await supabaseAdmin
      .from('reviews')
      .update({ rating, comment: comment ?? null })
      .eq('id', req.params.id)
      .select(MY_REVIEW_SELECT)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/reviews — admin only, all reviews across all products for moderation
router.get('/', requireAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('reviews')
      .select('*, products(id, name, image_url), profiles(full_name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/reviews/:id — owner or admin
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('reviews')
      .select('id, user_id')
      .eq('id', req.params.id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!existing) return res.status(404).json({ error: 'Review not found' });

    if (existing.user_id !== req.user.id) {
      const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', req.user.id).single();
      if (profile?.role !== 'admin') return res.status(404).json({ error: 'Review not found' });
    }

    const { error } = await supabaseAdmin
      .from('reviews')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
