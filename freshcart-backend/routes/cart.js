const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../supabaseClient');
const { requireAuth } = require('../middleware/auth');

// GET /api/cart — the caller's own cart, joined with product + variant details
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('cart_items')
      .select('id, product_id, variant_id, quantity, created_at, products(id, name, price, image_url, categories(name)), product_variants(id, name, price_adjustment, image_url)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cart — add (or bump quantity of) a product/variant in the caller's cart
router.post('/', requireAuth, async (req, res) => {
  try {
    const { product_id, variant_id = null, quantity = 1 } = req.body;
    if (!product_id) return res.status(400).json({ error: 'product_id is required' });

    const onConflict = variant_id ? 'user_id,product_id,variant_id' : 'user_id,product_id';
    const { data, error } = await supabaseAdmin
      .from('cart_items')
      .upsert([{ user_id: req.user.id, product_id, variant_id, quantity }], { onConflict })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/cart — update a cart line's quantity, matched by product_id (+ variant_id)
router.patch('/', requireAuth, async (req, res) => {
  try {
    const { product_id, variant_id = null, quantity } = req.body;
    if (!product_id) return res.status(400).json({ error: 'product_id is required' });
    if (!quantity || quantity < 1) return res.status(400).json({ error: 'quantity must be at least 1' });

    let query = supabaseAdmin
      .from('cart_items')
      .update({ quantity })
      .eq('user_id', req.user.id)
      .eq('product_id', product_id);
    query = variant_id ? query.eq('variant_id', variant_id) : query.is('variant_id', null);

    const { data, error } = await query.select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/cart — remove a cart line, matched by product_id (+ variant_id) query params
router.delete('/', requireAuth, async (req, res) => {
  try {
    const { product_id, variant_id } = req.query;
    if (!product_id) return res.status(400).json({ error: 'product_id is required' });

    let query = supabaseAdmin
      .from('cart_items')
      .delete()
      .eq('user_id', req.user.id)
      .eq('product_id', product_id);
    query = variant_id ? query.eq('variant_id', variant_id) : query.is('variant_id', null);

    const { error } = await query;
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
