const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../supabaseClient');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/reviews/mine — the caller's own submitted reviews, plus "pending"
// reviews: distinct products from their delivered orders that don't have a
// review yet. A review is unique per (product_id, user_id) regardless of which
// order it came from, so pending products are deduped the same way.
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const { data: reviews, error: reviewsErr } = await supabaseAdmin
      .from('reviews')
      .select('*, products(name, image_url)')
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
    const pending = [];
    for (const order of orders || []) {
      for (const item of order.order_items || []) {
        if (item.is_gift || !item.product_id) continue;
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

    res.json({
      reviews: reviews || [],
      pending,
      // "Rated X of Y delivered items" — powers the review-progress nudge on Orders.
      deliveredRatedCount: reviewedDeliveredProductIds.size,
      deliveredTotalCount: reviewedDeliveredProductIds.size + pending.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

// DELETE /api/reviews/:id — admin only
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
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
