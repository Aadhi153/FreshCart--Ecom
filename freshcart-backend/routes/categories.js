const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../supabaseClient');
const { requireAdmin } = require('../middleware/auth');

// GET /api/categories — public
router.get('/', async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .order('display_order');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/categories/:slug/products — public
router.get('/:slug/products', async (req, res) => {
  try {
    const { data: cat, error: cErr } = await supabaseAdmin
      .from('categories').select('id').eq('slug', req.params.slug).single();
    if (cErr) throw cErr;

    const { data, error } = await supabaseAdmin
      .from('products').select('*').eq('category_id', cat.id).eq('is_active', true);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(404).json({ error: 'Category not found' });
  }
});

// POST /api/categories — admin only
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, slug, image_url, display_order } = req.body;
    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert([{ name, slug, image_url, display_order }])
      .select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/categories/:id — admin only
router.patch('/:id', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .update(req.body)
      .eq('id', req.params.id)
      .select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/categories/:id — admin only
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('categories').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
