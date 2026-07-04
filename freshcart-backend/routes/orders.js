const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../supabaseClient');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { PlaceOrderPayloadSchema } = require('@freshcart/types');

// GET /api/orders — admin sees all; user sees own
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('role').eq('id', req.user.id).single();

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const from = (page - 1) * limit;

    let query = supabaseAdmin
      .from('orders')
      .select('*, order_items(*, products(name, image_url))', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (profile?.role !== 'admin') {
      query = query.eq('user_id', req.user.id);
    }

    if (req.query.status) query = query.eq('status', req.query.status);

    const { data, error, count } = await query.range(from, from + limit - 1);
    if (error) throw error;
    res.set('X-Total-Count', String(count ?? 0));
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/:id — owner or admin only
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('role').eq('id', req.user.id).single();

    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*, products(name, image_url))')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;

    if (profile?.role !== 'admin' && data.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(data);
  } catch (err) {
    res.status(404).json({ error: 'Order not found' });
  }
});

// POST /api/orders — place new order
router.post('/', requireAuth, async (req, res) => {
  try {
    const validationResult = PlaceOrderPayloadSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Validation failed', details: validationResult.error.issues });
    }
    const { items, delivery_address, delivery_slot, payment_method, coupon_code } = validationResult.data;

    // Never trust client-supplied prices/totals — look up authoritative prices and stock.
    const productIds = [...new Set(items.map(item => item.product_id))];
    const { data: products, error: prodErr } = await supabaseAdmin
      .from('products')
      .select('id, price, stock_quantity')
      .in('id', productIds);
    if (prodErr) throw prodErr;

    const productById = new Map(products.map(p => [p.id, p]));
    for (const item of items) {
      if (!productById.has(item.product_id)) {
        return res.status(400).json({ error: `Product ${item.product_id} not found` });
      }
    }

    const pricedItems = items.map(item => ({
      ...item,
      price: productById.get(item.product_id).price,
    }));
    const total_amount = pricedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Look up and apply the coupon server-side — never trust the client's discount math.
    // An invalid/expired/ineligible code is treated as "no discount" rather than failing the
    // order outright, since the client already validated it once before the final submit.
    let discount_amount = 0;
    let appliedCouponCode = null;
    if (coupon_code) {
      const { data: coupon } = await supabaseAdmin
        .from('coupons')
        .select('*')
        .eq('code', coupon_code.toUpperCase())
        .eq('active', true)
        .maybeSingle();
      if (coupon && (!coupon.expires_at || new Date(coupon.expires_at) > new Date()) && total_amount >= coupon.min_order_amount) {
        discount_amount = coupon.discount_type === 'flat'
          ? coupon.discount_value
          : (total_amount * coupon.discount_value) / 100;
        if (coupon.max_discount_amount != null) discount_amount = Math.min(discount_amount, coupon.max_discount_amount);
        discount_amount = Math.min(discount_amount, total_amount);
        appliedCouponCode = coupon.code;
      }
    }
    const finalTotal = total_amount - discount_amount;

    // 1️⃣ Create the order record
    const { data: order, error: oErr } = await supabaseAdmin
      .from('orders')
      .insert([{ user_id: req.user.id, total_amount: finalTotal, status: 'placed', delivery_address, delivery_slot, payment_method, coupon_code: appliedCouponCode, discount_amount }])
      .select()
      .single();
    if (oErr) throw oErr;

    // 2️⃣ Insert each order item at its authoritative (server-computed) price
    const orderItems = pricedItems.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price_at_time: item.price,
    }));
    const { error: iErr } = await supabaseAdmin.from('order_items').insert(orderItems);
    if (iErr) throw iErr;

    // 3️⃣ Reserve stock (compare-and-swap so concurrent orders can't oversell). If any
    // item can't be reserved, cancel the order instead of leaving it pending with no stock held.
    for (const item of pricedItems) {
      const product = productById.get(item.product_id);
      const newQty = (product.stock_quantity ?? 0) - item.quantity;
      const reserved = newQty >= 0 && await supabaseAdmin
        .from('products')
        .update({ stock_quantity: newQty })
        .eq('id', item.product_id)
        .eq('stock_quantity', product.stock_quantity) // only succeeds if nobody else changed it first
        .select()
        .single()
        .then(({ data, error }) => !error && !!data);

      if (!reserved) {
        await supabaseAdmin.from('orders').update({ status: 'cancelled' }).eq('id', order.id);
        return res.status(409).json({ error: `Insufficient stock for product ${item.product_id}, order cancelled` });
      }
    }

    // 4️⃣ Return the newly created order (including its ID)
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Release the stock reserved for an order's items back to `products`.
async function releaseReservedStock(order) {
  for (const item of order.order_items || []) {
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('stock_quantity')
      .eq('id', item.product_id)
      .single();
    if (product) {
      await supabaseAdmin
        .from('products')
        .update({ stock_quantity: (product.stock_quantity ?? 0) + item.quantity })
        .eq('id', item.product_id);
    }
  }
}

// PATCH /api/orders/:id/cancel — order owner only, and only while it hasn't shipped
const CANCELLABLE_STATUSES = ['placed', 'packed'];
router.patch('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const { data: order, error: fetchErr } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(product_id, quantity)')
      .eq('id', req.params.id)
      .single();
    if (fetchErr || !order) return res.status(404).json({ error: 'Order not found' });

    if (order.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      return res.status(400).json({ error: `Order can no longer be cancelled (status: ${order.status})` });
    }

    await releaseReservedStock(order);

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', order.id)
      .select('*, order_items(*, products(name, image_url))')
      .single();
    if (updateErr) throw updateErr;

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/orders/:id/status — admin only
router.patch('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['placed', 'packed', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    if (status === 'cancelled') {
      const { data: order, error: fetchErr } = await supabaseAdmin
        .from('orders')
        .select('*, order_items(product_id, quantity)')
        .eq('id', req.params.id)
        .single();
      if (fetchErr || !order) return res.status(404).json({ error: 'Order not found' });
      if (order.status !== 'cancelled') await releaseReservedStock(order);
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({ status })
      .eq('id', req.params.id)
      .select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
