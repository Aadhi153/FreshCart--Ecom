const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../supabaseClient');
const { requireAdmin } = require('../middleware/auth');

// GET /api/customers — admin only
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { search, role } = req.query;
    let query = supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (role) query = query.eq('role', role);
    if (search) {
      // Strip characters with special meaning in PostgREST filter syntax so a search
      // value can't inject extra filter clauses (e.g. `,role.eq.admin`).
      const safeSearch = search.replace(/[,()."]/g, '');
      query = query.or(`full_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers/:id — admin only
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { data: profile, error: pErr } = await supabaseAdmin
      .from('profiles').select('*').eq('id', req.params.id).single();
    if (pErr) throw pErr;

    const { data: orders, error: oErr } = await supabaseAdmin
      .from('orders').select('id, status, total_amount, created_at').eq('user_id', req.params.id);
    if (oErr) throw oErr;

    res.json({ ...profile, orders });
  } catch (err) {
    res.status(404).json({ error: 'Customer not found' });
  }
});

// PATCH /api/customers/:id/role — admin only (promote/demote)
router.patch('/:id/role', requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['customer', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Role must be customer or admin' });
    }
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
