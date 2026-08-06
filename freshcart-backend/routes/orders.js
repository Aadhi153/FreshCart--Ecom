const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../supabaseClient');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { PlaceOrderPayloadSchema, DELIVERY_SLOT_MAX_ORDERS_PER_WINDOW, FREE_DELIVERY_THRESHOLD, DELIVERY_FEE } = require('@freshcart/types');
const { sendOrderConfirmationEmail } = require('../lib/mailer');
const { notifyOrderStatus } = require('../lib/notifications');
const { isSlotBookable, buildSlotLabel } = require('../lib/deliverySlots');
const {
  isWithinValidity,
  underUsageLimits,
  selectBestPromotion,
  meetsMinimumOrder,
  giftProductDetails,
  getUserEligibilityContext,
  meetsFirstOrderRequirement,
  matchesTargetSegment,
} = require('../lib/promotions');

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

// GET /api/orders/summary — order count + total spent for the current user,
// excluding cancelled orders (never charged/kept). Must be registered before
// the /:id route below or Express would match "summary" as an order id.
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('total_amount, status')
      .eq('user_id', req.user.id)
      .neq('status', 'cancelled');
    if (error) throw error;

    const orderCount = data.length;
    const totalSpent = data.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
    // Every non-cancelled order that isn't delivered yet is still in transit
    // (placed/packed/shipped).
    const inTransitCount = data.filter((order) => order.status !== 'delivered').length;
    res.json({ orderCount, totalSpent, inTransitCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/repeat-items — products bought in 2+ separate (non-cancelled)
// orders, most-repeated first. Powers the "Reorder your usual" quick action.
// Must also be registered before /:id.
router.get('/repeat-items', requireAuth, async (req, res) => {
  try {
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('id, order_items(product_id, is_gift, products(name, image_url, price))')
      .eq('user_id', req.user.id)
      .neq('status', 'cancelled');
    if (error) throw error;

    const byProduct = new Map();
    for (const order of orders || []) {
      for (const item of order.order_items || []) {
        if (item.is_gift || !item.product_id || !item.products) continue;
        let entry = byProduct.get(item.product_id);
        if (!entry) {
          entry = {
            product_id: item.product_id,
            name: item.products.name,
            image_url: item.products.image_url,
            price: Number(item.products.price),
            orderIds: new Set(),
          };
          byProduct.set(item.product_id, entry);
        }
        entry.orderIds.add(order.id);
      }
    }

    const repeatItems = [...byProduct.values()]
      .filter((entry) => entry.orderIds.size >= 2)
      .sort((a, b) => b.orderIds.size - a.orderIds.size)
      .slice(0, 5)
      .map(({ orderIds, ...rest }) => ({ ...rest, orderCount: orderIds.size }));

    res.json(repeatItems);
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
    const { items, delivery_address, delivery_slot, payment_method, coupon_code, idempotency_key } = validationResult.data;

    // A double-click or network retry resubmits the same idempotency_key — return
    // the order already created for it instead of placing a second one.
    if (idempotency_key) {
      const { data: existing } = await supabaseAdmin
        .from('orders')
        .select('*, order_items(*, products(name, image_url))')
        .eq('user_id', req.user.id)
        .eq('idempotency_key', idempotency_key)
        .maybeSingle();
      if (existing) return res.status(200).json(existing);
    }

    // Never trust client-supplied prices/totals — look up authoritative prices and stock.
    const productIds = [...new Set(items.map(item => item.product_id))];
    const { data: products, error: prodErr } = await supabaseAdmin
      .from('products')
      .select('id, name, price, stock_quantity, category_id')
      .in('id', productIds);
    if (prodErr) throw prodErr;

    const productById = new Map(products.map(p => [p.id, p]));
    for (const item of items) {
      if (!productById.has(item.product_id)) {
        return res.status(400).json({ error: `Product ${item.product_id} not found` });
      }
    }

    // Never trust a client-selected slot blindly — re-check the cutoff/horizon and
    // re-count capacity here, the same way stock is re-verified below.
    if (!isSlotBookable(delivery_slot.date, delivery_slot.window)) {
      return res.status(400).json({ error: 'This delivery slot is no longer available. Please choose another.' });
    }
    const { count: slotOrderCount, error: slotCountErr } = await supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('delivery_slot_date', delivery_slot.date)
      .eq('delivery_slot_window', delivery_slot.window)
      .neq('status', 'cancelled');
    if (slotCountErr) throw slotCountErr;
    if ((slotOrderCount ?? 0) >= DELIVERY_SLOT_MAX_ORDERS_PER_WINDOW) {
      return res.status(409).json({ error: 'This delivery slot is fully booked. Please choose another.' });
    }

    const pricedItems = items.map(item => ({
      ...item,
      price: productById.get(item.product_id).price,
    }));
    const total_amount = pricedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Look up and apply a promotion server-side — never trust the client's discount math.
    // An invalid/expired/ineligible coupon is treated as "no discount" rather than failing
    // the order outright, since the client already validated it once before the final submit.
    // If both a coupon and an auto-offer would apply, only the larger discount is kept —
    // promotions never stack in v1.
    const cartItemsForPromo = pricedItems.map(item => ({
      product_id: item.product_id,
      category_id: productById.get(item.product_id).category_id,
      quantity: item.quantity,
      price: item.price,
    }));

    // Fetched once and threaded through every candidate below — never re-queried per
    // promotion (see getUserEligibilityContext's own comment for why).
    const eligibilityContext = await getUserEligibilityContext(req.user.id);

    // Gather eligible candidates (active, valid, min order met, under usage limits,
    // matches first-order/segment targeting) — selectBestPromotion below decides which
    // single one wins.
    let eligibleCoupon = null;
    if (coupon_code) {
      const { data: coupon } = await supabaseAdmin
        .from('promotions')
        .select('*')
        .eq('code', coupon_code.toUpperCase())
        .eq('requires_code', true)
        .eq('is_active', true)
        .maybeSingle();
      if (coupon && isWithinValidity(coupon) && meetsMinimumOrder(coupon, total_amount)
          && meetsFirstOrderRequirement(coupon, eligibilityContext)
          && matchesTargetSegment(coupon, eligibilityContext)
          && await underUsageLimits(coupon, req.user.id)) {
        eligibleCoupon = coupon;
      }
    }

    const { data: autoOffers } = await supabaseAdmin
      .from('promotions')
      .select('*')
      .eq('requires_code', false)
      .eq('is_active', true);
    const eligibleAutoOffers = [];
    for (const offer of (autoOffers || []).filter(o => isWithinValidity(o))) {
      if (!meetsMinimumOrder(offer, total_amount)) continue;
      if (!meetsFirstOrderRequirement(offer, eligibilityContext)) continue;
      if (!matchesTargetSegment(offer, eligibilityContext)) continue;
      if (!(await underUsageLimits(offer, req.user.id))) continue;
      eligibleAutoOffers.push(offer);
    }

    // Attach gift_product onto any gift_with_purchase candidate before ranking —
    // computeDiscountForCart (via selectBestPromotion) needs the gift's price to rank
    // it fairly against a flat/percentage/bogo discount.
    const giftCandidates = [eligibleCoupon, ...eligibleAutoOffers].filter(p => p?.discount_type === 'gift_with_purchase' && p.gift_product_id);
    if (giftCandidates.length > 0) {
      const { data: giftProducts, error: giftErr } = await supabaseAdmin
        .from('products')
        .select('id, name, price, stock_quantity')
        .in('id', giftCandidates.map(p => p.gift_product_id));
      if (giftErr) throw giftErr;
      const giftProductsById = new Map((giftProducts || []).map(p => [p.id, p]));
      for (const candidate of giftCandidates) candidate.gift_product = giftProductDetails(candidate, giftProductsById);
    }

    let appliedPromotion = selectBestPromotion({
      coupon: eligibleCoupon,
      autoOffers: eligibleAutoOffers,
      cartItems: cartItemsForPromo,
      cartSubtotal: total_amount,
    }); // { id, name, amount, discount_type, gift_product } | null

    // Atomically reserve the redemption *before* the total is finalized — this is
    // the authoritative usage-limit check (underUsageLimits above is only an
    // advisory pre-check). redeem_promotion() locks the promotion row and
    // rejects if usage_limit_total/usage_limit_per_user is already met, so a
    // losing racer never gets the discounted price in the first place. order_id
    // is attached below once the order exists, and the reservation is released
    // if the order is later cancelled for insufficient stock.
    let redemptionId = null;
    if (appliedPromotion) {
      const { data: redeemedId, error: redeemErr } = await supabaseAdmin.rpc('redeem_promotion', {
        p_promotion_id: appliedPromotion.id,
        p_user_id: req.user.id,
        p_discount_amount: appliedPromotion.amount,
      });
      if (redeemErr) throw redeemErr;
      if (redeemedId) {
        redemptionId = redeemedId;
      } else {
        // Usage limit was hit by a concurrent request between our advisory check
        // and now — treat like an invalid coupon: proceed without the discount.
        appliedPromotion = null;
      }
    }

    // free_shipping never discounts items — it waives delivery_fee below instead, so
    // it must never also land in discount_amount (that would double the customer's
    // savings: once as a delivery waiver, once again as an item discount). Same logic
    // for gift_with_purchase: the "discount" is a free product injected as its own
    // order_item below, not a subtraction from the cart total.
    const isFreeShipping = appliedPromotion?.discount_type === 'free_shipping';
    const isGift = appliedPromotion?.discount_type === 'gift_with_purchase';
    const discount_amount = (isFreeShipping || isGift) ? 0 : (appliedPromotion?.amount ?? 0);
    const appliedCouponCode = appliedPromotion?.name ?? null;
    const delivery_fee = (!isFreeShipping && total_amount > 0 && total_amount < FREE_DELIVERY_THRESHOLD) ? DELIVERY_FEE : 0;
    const finalTotal = total_amount - discount_amount + delivery_fee;

    // 1️⃣ Create the order record
    const { data: order, error: oErr } = await supabaseAdmin
      .from('orders')
      .insert([{
        user_id: req.user.id,
        total_amount: finalTotal,
        status: 'placed',
        delivery_address,
        delivery_slot: buildSlotLabel(delivery_slot.date, delivery_slot.window),
        delivery_slot_date: delivery_slot.date,
        delivery_slot_window: delivery_slot.window,
        payment_method,
        coupon_code: appliedCouponCode,
        discount_amount,
        delivery_fee,
        promotion_id: appliedPromotion?.id ?? null,
        idempotency_key: idempotency_key ?? null,
      }])
      .select()
      .single();
    if (oErr) {
      // Race-safety backstop for the idempotency check above: if two requests with
      // the same key both passed the pre-check, the unique index rejects the second
      // insert (23505) — return the order the first request created instead of erroring.
      if (oErr.code === '23505' && idempotency_key) {
        const { data: existing } = await supabaseAdmin
          .from('orders')
          .select('*, order_items(*, products(name, image_url))')
          .eq('user_id', req.user.id)
          .eq('idempotency_key', idempotency_key)
          .maybeSingle();
        if (existing) {
          if (redemptionId) await supabaseAdmin.from('promotion_redemptions').delete().eq('id', redemptionId);
          return res.status(200).json(existing);
        }
      }
      throw oErr;
    }

    // Attach the now-known order_id to the redemption reserved above.
    if (redemptionId) {
      await supabaseAdmin.from('promotion_redemptions').update({ order_id: order.id }).eq('id', redemptionId);
    }

    // 2️⃣ Insert each order item at its authoritative (server-computed) price
    const orderItems = pricedItems.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price_at_time: item.price,
    }));
    const { error: iErr } = await supabaseAdmin.from('order_items').insert(orderItems);
    if (iErr) throw iErr;

    // If a gift_with_purchase promotion won, reserve the gift's stock the same
    // compare-and-swap way paid items are below — but standalone, never part of the
    // all-or-nothing loop that cancels the order. A failed reservation (out of stock)
    // just means the shopper doesn't get the freebie this time, never a reason to
    // cancel or fail the paid order. Stock IS decremented (not skipped) for a granted
    // gift so inventory stays accurate — releaseReservedStock restocks it for free on
    // cancellation since it already iterates every order_items row generically.
    let giftGranted = null;
    if (isGift && appliedPromotion.gift_product) {
      const giftProduct = appliedPromotion.gift_product;
      const newGiftQty = (giftProduct.stock_quantity ?? 0) - 1;
      const giftReserved = newGiftQty >= 0 && await supabaseAdmin
        .from('products')
        .update({ stock_quantity: newGiftQty })
        .eq('id', giftProduct.id)
        .eq('stock_quantity', giftProduct.stock_quantity)
        .select()
        .single()
        .then(({ data, error }) => !error && !!data);

      if (giftReserved) {
        const { error: giftItemErr } = await supabaseAdmin.from('order_items').insert([{
          order_id: order.id,
          product_id: giftProduct.id,
          quantity: 1,
          price_at_time: 0,
          is_gift: true,
        }]);
        if (giftItemErr) throw giftItemErr;
        giftGranted = giftProduct;
      }
    }

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
        // Release the promotion reservation too — a stock-cancelled order should
        // never permanently consume a usage-limit slot.
        if (redemptionId) {
          await supabaseAdmin.from('promotion_redemptions').delete().eq('id', redemptionId);
        }
        return res.status(409).json({ error: `Insufficient stock for product ${item.product_id}, order cancelled` });
      }
    }

    // 4️⃣ Email the customer their confirmation — never let this delay or fail the response.
    const emailItems = pricedItems.map(item => ({
      name: productById.get(item.product_id).name,
      quantity: item.quantity,
      price: item.price,
    }));
    if (giftGranted) emailItems.push({ name: `${giftGranted.name} (free gift)`, quantity: 1, price: 0 });
    sendOrderConfirmationEmail(order, emailItems, req.user.email);
    notifyOrderStatus(order);

    // 5️⃣ Return the newly created order (including its ID)
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

    notifyOrderStatus(updated);
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

    const updates = { status };
    // Recorded once here since nothing else timestamps a per-status transition — the
    // return/replace window (see routes/returns.js) is computed from this field.
    if (status === 'delivered') updates.delivered_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update(updates)
      .eq('id', req.params.id)
      .select().single();
    if (error) throw error;
    notifyOrderStatus(data);
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
