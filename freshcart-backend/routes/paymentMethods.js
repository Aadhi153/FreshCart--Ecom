const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../supabaseClient');
const { requireAuth } = require('../middleware/auth');

// Belt-and-suspenders against ever storing a real card number: reject anything
// that looks like a full PAN (13-19 consecutive digits, optionally spaced/dashed)
// even though the UI only ever asks for last-4 — see 00030_payment_methods.sql.
const LOOKS_LIKE_FULL_CARD_NUMBER = /(?:\d[ -]?){13,19}/;

// GET /api/payment-methods — the caller's own saved methods
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('payment_methods')
      .select('*')
      .eq('user_id', req.user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payment-methods — add a saved method (masked value only, never a raw card number)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { type, masked_display_value, provider, is_default } = req.body;
    if (!['card', 'upi', 'wallet'].includes(type)) {
      return res.status(400).json({ error: 'Invalid payment method type.' });
    }
    if (!masked_display_value || typeof masked_display_value !== 'string' || !masked_display_value.trim()) {
      return res.status(400).json({ error: 'A display label is required.' });
    }
    if (LOOKS_LIKE_FULL_CARD_NUMBER.test(masked_display_value)) {
      return res.status(400).json({ error: 'Enter only the last 4 digits, not a full card number.' });
    }
    if (provider !== undefined && provider !== null && typeof provider !== 'string') {
      return res.status(400).json({ error: 'Invalid provider.' });
    }

    if (is_default) {
      await supabaseAdmin.from('payment_methods').update({ is_default: false }).eq('user_id', req.user.id);
    }

    const { data, error } = await supabaseAdmin
      .from('payment_methods')
      .insert([{
        user_id: req.user.id,
        type,
        masked_display_value: masked_display_value.trim(),
        provider: provider ? provider.trim() : null,
        is_default: Boolean(is_default),
      }])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/payment-methods/:id — edit the display label and/or provider of a saved method
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { masked_display_value, provider } = req.body;
    const updates = {};

    if (masked_display_value !== undefined) {
      if (typeof masked_display_value !== 'string' || !masked_display_value.trim()) {
        return res.status(400).json({ error: 'A display label is required.' });
      }
      if (LOOKS_LIKE_FULL_CARD_NUMBER.test(masked_display_value)) {
        return res.status(400).json({ error: 'Enter only the last 4 digits, not a full card number.' });
      }
      updates.masked_display_value = masked_display_value.trim();
    }
    if (provider !== undefined) {
      if (provider !== null && typeof provider !== 'string') {
        return res.status(400).json({ error: 'Invalid provider.' });
      }
      updates.provider = provider ? provider.trim() : null;
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nothing to update.' });
    }

    const { data, error } = await supabaseAdmin
      .from('payment_methods')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Payment method not found' });
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/payment-methods/:id/default — make this the default method
router.patch('/:id/default', requireAuth, async (req, res) => {
  try {
    const { data: existing } = await supabaseAdmin
      .from('payment_methods')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .maybeSingle();
    if (!existing) return res.status(404).json({ error: 'Payment method not found' });

    await supabaseAdmin.from('payment_methods').update({ is_default: false }).eq('user_id', req.user.id);
    const { data, error } = await supabaseAdmin
      .from('payment_methods')
      .update({ is_default: true })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/payment-methods/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('payment_methods')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
