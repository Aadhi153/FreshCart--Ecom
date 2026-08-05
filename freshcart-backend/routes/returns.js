const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../supabaseClient');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { CreateReturnRequestPayloadSchema, RETURN_WINDOW_DAYS, RETURN_REQUEST_STATUSES } = require('@freshcart/types');
const { notifyReturnStatus } = require('../lib/notifications');

const RETURN_REQUEST_SELECT =
  '*, orders(id, status, delivered_at, created_at), order_items(id, product_id, quantity, price_at_time, is_gift, products(name, image_url)), profiles(full_name, email)';

// GET /api/returns — admin sees all; user sees own
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', req.user.id).single();

    let query = supabaseAdmin
      .from('return_requests')
      .select(RETURN_REQUEST_SELECT)
      .order('created_at', { ascending: false });

    if (profile?.role !== 'admin') {
      query = query.eq('user_id', req.user.id);
    }
    if (req.query.status) query = query.eq('status', req.query.status);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/returns — request a return or replacement for a delivered order's item
router.post('/', requireAuth, async (req, res) => {
  try {
    const validationResult = CreateReturnRequestPayloadSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Validation failed', details: validationResult.error.issues });
    }
    const { order_id, order_item_id, type, reason, refund_method } = validationResult.data;

    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, status, delivered_at')
      .eq('id', order_id)
      .maybeSingle();
    if (orderErr) throw orderErr;
    if (!order || order.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.status !== 'delivered') {
      return res.status(400).json({ error: 'Only delivered orders are eligible for return or replacement.' });
    }
    if (!order.delivered_at) {
      return res.status(400).json({ error: 'This order predates return tracking and is not eligible.' });
    }
    const deadline = new Date(order.delivered_at).getTime() + RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    if (Date.now() > deadline) {
      return res.status(400).json({ error: `The ${RETURN_WINDOW_DAYS}-day return window for this order has passed.` });
    }

    const { data: orderItem, error: itemErr } = await supabaseAdmin
      .from('order_items')
      .select('id, order_id, product_id, quantity, price_at_time, is_gift')
      .eq('id', order_item_id)
      .maybeSingle();
    if (itemErr) throw itemErr;
    if (!orderItem || orderItem.order_id !== order_id) {
      return res.status(404).json({ error: 'Order item not found' });
    }
    if (orderItem.is_gift) {
      return res.status(400).json({ error: 'Free gifts cannot be returned or replaced.' });
    }

    // Only one active (non-rejected) request per item at a time — a rejected request
    // doesn't permanently block a customer from trying again with a different reason.
    const { data: existing, error: existingErr } = await supabaseAdmin
      .from('return_requests')
      .select('id')
      .eq('order_item_id', order_item_id)
      .neq('status', 'rejected')
      .maybeSingle();
    if (existingErr) throw existingErr;
    if (existing) {
      return res.status(409).json({ error: 'A return or replacement has already been requested for this item.' });
    }

    const { data, error } = await supabaseAdmin
      .from('return_requests')
      .insert([{
        order_id,
        order_item_id,
        user_id: req.user.id,
        type,
        reason,
        refund_method: type === 'return' ? refund_method : null,
        status: 'requested',
      }])
      .select(RETURN_REQUEST_SELECT)
      .single();
    if (error) throw error;

    notifyReturnStatus(data);
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/returns/:id/status — admin only: approve/reject/picked_up/completed
router.patch('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!RETURN_REQUEST_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${RETURN_REQUEST_STATUSES.join(', ')}` });
    }

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('return_requests')
      .select('*, order_items(id, product_id, quantity, price_at_time)')
      .eq('id', req.params.id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!existing) return res.status(404).json({ error: 'Return request not found' });

    // Restock only a *returned* item, only once, the moment it's actually confirmed back
    // in hand (picked_up) — not for 'replace' requests, which don't put the original item
    // back on sale, and not again if already picked_up/completed.
    if (status === 'picked_up' && existing.type === 'return' && !['picked_up', 'completed'].includes(existing.status)) {
      const item = existing.order_items;
      if (item) {
        const { data: product } = await supabaseAdmin.from('products').select('stock_quantity').eq('id', item.product_id).single();
        if (product) {
          await supabaseAdmin.from('products').update({ stock_quantity: (product.stock_quantity ?? 0) + item.quantity }).eq('id', item.product_id);
        }
      }
    }

    const updates = { status, updated_at: new Date().toISOString() };
    if (status === 'completed' && existing.type === 'return' && existing.refund_amount == null) {
      const item = existing.order_items;
      updates.refund_amount = item ? Number(item.price_at_time) * item.quantity : 0;
    }

    const { data, error } = await supabaseAdmin
      .from('return_requests')
      .update(updates)
      .eq('id', req.params.id)
      .select(RETURN_REQUEST_SELECT)
      .single();
    if (error) throw error;

    notifyReturnStatus(data);
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
