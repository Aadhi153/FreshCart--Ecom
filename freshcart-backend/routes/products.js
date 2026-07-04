const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../supabaseClient');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { ProductSchema } = require('@freshcart/types');

// GET /api/products — public
router.get('/', async (req, res) => {
  try {
    const { category, search, active } = req.query;
    let query = supabaseAdmin
      .from('products')
      .select('*, categories(id, name, slug), product_variants(*), reviews(*)')
      .order('created_at', { ascending: false });

    if (active !== 'all') query = query.eq('in_stock', true);
    if (category && category !== 'All') {
      const { data: cat } = await supabaseAdmin
        .from('categories')
        .select('id')
        .or(`slug.eq.${category},name.eq.${category}`)
        .maybeSingle();
      if (cat) query = query.eq('category_id', cat.id);
    }
    if (search) query = query.ilike('name', `%${search}%`);

    res.setHeader('Cache-Control', 'no-store');
    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/:id — public
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*, categories(id, name, slug), product_variants(*), reviews(*, profiles(full_name))')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(404).json({ error: 'Product not found' });
  }
});

// POST /api/products — admin only
router.post('/', requireAdmin, async (req, res) => {
  try {
    const validationResult = ProductSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Validation failed', details: validationResult.error.issues });
    }
    const { name, description, price, image_url, in_stock, category_id, stock_quantity, variants } = validationResult.data;
    // Ensure at least one variant is provided
    if (!variants || variants.length === 0) {
      return res.status(400).json({ error: 'At least one variant is required for a product' });
    }

    // Insert base product
    const { data: product, error } = await supabaseAdmin
      .from('products')
      .insert([
        {
          name,
          description,
          price,
          image_url,
          in_stock: in_stock ?? true,
          category_id,
          stock_quantity: stock_quantity ?? 10,
        },
      ])
      .select()
      .single();
    if (error) throw error;

    // Insert variants linked to the product
    if (variants && variants.length > 0) {
      const variantsToInsert = variants.map(v => ({ ...v, product_id: product.id }));
      await supabaseAdmin.from('product_variants').insert(variantsToInsert);
    }

    // Fetch complete product with variants to return
    const { data: finalProduct } = await supabaseAdmin
      .from('products')
      .select('*, categories(id, name, slug), product_variants(*)')
      .eq('id', product.id)
      .single();

    res.status(201).json(finalProduct);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/products/:id — admin only
router.patch('/:id', requireAdmin, async (req, res) => {
  try {
    const validationResult = ProductSchema.partial().safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Validation failed', details: validationResult.error.issues });
    }
    const { variants, ...productData } = validationResult.data;
    const { data: product, error } = await supabaseAdmin
      .from('products')
      .update(productData)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;

    if (variants) {
      // Simplistic approach: delete existing and re-insert
      await supabaseAdmin.from('product_variants').delete().eq('product_id', req.params.id);
      if (variants.length > 0) {
        const variantsToInsert = variants.map(v => ({ ...v, product_id: req.params.id }));
        await supabaseAdmin.from('product_variants').insert(variantsToInsert);
      }
    }

    const { data: finalProduct } = await supabaseAdmin.from('products').select('*, categories(id, name, slug), product_variants(*)').eq('id', req.params.id).single();
    res.json(finalProduct);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/products/:id — admin only
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/products/:id/reviews — authenticated user only
router.post('/:id/reviews', requireAuth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const { data, error } = await supabaseAdmin
      .from('reviews')
      .insert([{ product_id: req.params.id, user_id: req.user.id, rating, comment }])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
