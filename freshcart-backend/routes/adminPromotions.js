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
