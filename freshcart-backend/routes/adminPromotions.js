const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../supabaseClient');
const { requireAdmin } = require('../middleware/auth');
const { PromotionSchema } = require('@freshcart/types');

// All routes here are admin-only — this is the authoring surface for both coupons
// (requires_code=true) and auto-applied offers (requires_code=false).

// POST /api/admin/promotions — create
router.post('/', requireAdmin, async (req, res) => {
  try {
    const validationResult = PromotionSchema.omit({ id: true, created_at: true, redemption_count: true }).safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Validation failed', details: validationResult.error.issues });
    }
    const { data, error } = await supabaseAdmin
      .from('promotions')
      .insert([validationResult.data])
      .select()
      .single();
    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'A promotion with this code already exists.' });
      }
      throw error;
    }
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/admin/promotions — list all, including redemption counts
router.get('/', requireAdmin, async (_req, res) => {
  try {
    const { data: promotions, error } = await supabaseAdmin
      .from('promotions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const { data: redemptions, error: redErr } = await supabaseAdmin
      .from('promotion_redemptions')
      .select('promotion_id');
    if (redErr) throw redErr;

    const counts = (redemptions || []).reduce((acc, r) => {
      acc[r.promotion_id] = (acc[r.promotion_id] || 0) + 1;
      return acc;
    }, {});

    res.json((promotions || []).map((p) => ({ ...p, redemption_count: counts[p.id] || 0 })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/promotions/:id — single promotion, for the edit page
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('promotions')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Promotion not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/promotions/:id/performance — redemptions/discount/revenue for one
// promotion, joined from promotion_redemptions + orders (no new tracking tables).
// Aggregation is done in JS rather than SQL, same convention as routes/analytics.js,
// which also excludes cancelled orders from revenue figures.
router.get('/:id/performance', requireAdmin, async (req, res) => {
  try {
    const { data: promotion, error: promoErr } = await supabaseAdmin
      .from('promotions')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (promoErr) throw promoErr;
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });

    const { data: redemptionRows, error: redErr } = await supabaseAdmin
      .from('promotion_redemptions')
      .select('id, user_id, order_id, discount_amount_applied, redeemed_at, orders(total_amount, status), profiles(full_name, email)')
      .eq('promotion_id', req.params.id)
      .order('redeemed_at', { ascending: false });
    if (redErr) throw redErr;

    const rows = redemptionRows || [];
    const nonCancelled = rows.filter((r) => r.orders && r.orders.status !== 'cancelled');
    const totalDiscountGiven = rows.reduce((sum, r) => sum + parseFloat(r.discount_amount_applied || 0), 0);
    const revenueFromOrders = nonCancelled.reduce((sum, r) => sum + parseFloat(r.orders.total_amount || 0), 0);

    res.json({
      promotion,
      kpis: {
        totalRedemptions: rows.length,
        totalDiscountGiven,
        revenueFromOrders,
        uniqueCustomers: new Set(rows.map((r) => r.user_id).filter(Boolean)).size,
        averageOrderValue: nonCancelled.length > 0 ? revenueFromOrders / nonCancelled.length : 0,
      },
      redemptions: rows.map((r) => ({
        id: r.id,
        order_id: r.order_id,
        customer_name: r.profiles?.full_name || r.profiles?.email || 'Unknown',
        discount_amount_applied: r.discount_amount_applied,
        order_total: r.orders?.total_amount ?? null,
        order_status: r.orders?.status ?? null,
        redeemed_at: r.redeemed_at,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/promotions/:id — edit or toggle is_active
router.patch('/:id', requireAdmin, async (req, res) => {
  try {
    const validationResult = PromotionSchema.omit({ id: true, created_at: true, redemption_count: true }).partial().safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Validation failed', details: validationResult.error.issues });
    }
    const { data, error } = await supabaseAdmin
      .from('promotions')
      .update(validationResult.data)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'A promotion with this code already exists.' });
      }
      throw error;
    }
    if (!data) return res.status(404).json({ error: 'Promotion not found' });
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/admin/promotions/:id — only allowed if no existing redemptions
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { count, error: countErr } = await supabaseAdmin
      .from('promotion_redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('promotion_id', req.params.id);
    if (countErr) throw countErr;
    if ((count ?? 0) > 0) {
      return res.status(409).json({ error: 'Cannot delete a promotion that has been redeemed. Deactivate it instead.' });
    }

    const { error } = await supabaseAdmin.from('promotions').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
