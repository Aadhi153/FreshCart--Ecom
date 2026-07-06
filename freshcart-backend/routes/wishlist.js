const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../supabaseClient');
const { requireAuth } = require('../middleware/auth');

// GET /api/wishlist — the caller's own wishlist, joined with product details
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('wishlists')
      .select('product_id, created_at, products(id, name, price, image_url, categories(name))')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/wishlist — add a product to the caller's wishlist
router.post('/', requireAuth, async (req, res) => {
  try {
    const { product_id } = req.body;
    if (!product_id) return res.status(400).json({ error: 'product_id is required' });

    const { data, error } = await supabaseAdmin
      .from('wishlists')
      .upsert([{ user_id: req.user.id, product_id }], { onConflict: 'user_id,product_id' })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/wishlist/:productId — remove a product from the caller's wishlist
router.delete('/:productId', requireAuth, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('wishlists')
      .delete()
      .eq('user_id', req.user.id)
      .eq('product_id', req.params.productId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
