const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../supabaseClient');
const { requireAuth } = require('../middleware/auth');

const PHONE_REGEX = /^\d{10}$/;
const PINCODE_REGEX = /^\d{6}$/;
const VALID_TYPES = ['home', 'work', 'other'];

function validateAddressFields(body, { partial } = {}) {
  const { type, full_name, phone, line1, city, state, pincode, latitude, longitude } = body;

  if (type !== undefined && !VALID_TYPES.includes(type)) {
    return 'Invalid address type.';
  }
  if (!partial || full_name !== undefined) {
    if (!full_name || typeof full_name !== 'string' || !full_name.trim()) return 'Full name is required.';
  }
  if (!partial || phone !== undefined) {
    if (!phone || !PHONE_REGEX.test(String(phone).trim())) return 'Enter a valid 10-digit phone number.';
  }
  if (!partial || line1 !== undefined) {
    if (!line1 || typeof line1 !== 'string' || !line1.trim()) return 'Address line is required.';
  }
  if (!partial || city !== undefined) {
    if (!city || typeof city !== 'string' || !city.trim()) return 'City is required.';
  }
  if (!partial || state !== undefined) {
    if (!state || typeof state !== 'string' || !state.trim()) return 'State is required.';
  }
  if (!partial || pincode !== undefined) {
    if (!pincode || !PINCODE_REGEX.test(String(pincode).trim())) return 'Enter a valid 6-digit PIN code.';
  }
  if (latitude !== undefined && latitude !== null && typeof latitude !== 'number') return 'Invalid latitude.';
  if (longitude !== undefined && longitude !== null && typeof longitude !== 'number') return 'Invalid longitude.';
  return null;
}

// GET /api/addresses — the caller's own saved addresses
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('addresses')
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

// POST /api/addresses — add a saved address
router.post('/', requireAuth, async (req, res) => {
  try {
    const validationError = validateAddressFields(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const { label, type, full_name, phone, line1, city, state, pincode, latitude, longitude, is_default } = req.body;

    const { count } = await supabaseAdmin
      .from('addresses')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.user.id);
    const makeDefault = Boolean(is_default) || !count;

    if (makeDefault) {
      await supabaseAdmin.from('addresses').update({ is_default: false }).eq('user_id', req.user.id);
    }

    const { data, error } = await supabaseAdmin
      .from('addresses')
      .insert([{
        user_id: req.user.id,
        label: label ? String(label).trim() : null,
        type: type || 'home',
        full_name: full_name.trim(),
        phone: String(phone).trim(),
        line1: line1.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: String(pincode).trim(),
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        is_default: makeDefault,
      }])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/addresses/:id — edit a saved address
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const validationError = validateAddressFields(req.body, { partial: true });
    if (validationError) return res.status(400).json({ error: validationError });

    const { label, type, full_name, phone, line1, city, state, pincode, latitude, longitude } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (label !== undefined) updates.label = label ? String(label).trim() : null;
    if (type !== undefined) updates.type = type;
    if (full_name !== undefined) updates.full_name = full_name.trim();
    if (phone !== undefined) updates.phone = String(phone).trim();
    if (line1 !== undefined) updates.line1 = line1.trim();
    if (city !== undefined) updates.city = city.trim();
    if (state !== undefined) updates.state = state.trim();
    if (pincode !== undefined) updates.pincode = String(pincode).trim();
    if (latitude !== undefined) updates.latitude = latitude;
    if (longitude !== undefined) updates.longitude = longitude;

    const { data, error } = await supabaseAdmin
      .from('addresses')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Address not found' });
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/addresses/:id/default — make this the default address
router.patch('/:id/default', requireAuth, async (req, res) => {
  try {
    const { data: existing } = await supabaseAdmin
      .from('addresses')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .maybeSingle();
    if (!existing) return res.status(404).json({ error: 'Address not found' });

    await supabaseAdmin.from('addresses').update({ is_default: false }).eq('user_id', req.user.id);
    const { data, error } = await supabaseAdmin
      .from('addresses')
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

// DELETE /api/addresses/:id — if the deleted address was the default, promote
// the next-most-recent remaining address so a default always exists whenever
// at least one address is saved (mirrors the old local-store removeAddress behavior).
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { data: existing } = await supabaseAdmin
      .from('addresses')
      .select('id, is_default')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .maybeSingle();
    if (!existing) return res.status(404).json({ error: 'Address not found' });

    const { error } = await supabaseAdmin
      .from('addresses')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);
    if (error) throw error;

    if (existing.is_default) {
      const { data: remaining } = await supabaseAdmin
        .from('addresses')
        .select('id')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (remaining && remaining.length > 0) {
        await supabaseAdmin.from('addresses').update({ is_default: true }).eq('id', remaining[0].id);
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
