const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../supabaseClient');
const { requireAuth } = require('../middleware/auth');
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_12345');

// POST /api/payments/create-intent
router.post('/create-intent', requireAuth, async (req, res) => {
  try {
    const { order_id } = req.body;
    if (!order_id) {
      return res.status(400).json({ error: 'order_id required' });
    }
    // Fetch order total amount — always priced server-side, never trust a client-supplied amount.
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('total_amount')
      .eq('id', order_id)
      .eq('user_id', req.user.id)
      .single();
    if (error || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.total_amount * 100), // smallest currency unit
      currency: 'inr',
      metadata: { order_id },
    });
    // Store payment intent ID in order record
    await supabaseAdmin
      .from('orders')
      .update({ payment_intent_id: paymentIntent.id })
      .eq('id', order_id);
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/webhook — mounted in index.js with express.raw() ahead of the
// global JSON body parser so the raw body is available for signature verification.
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;
  try {
    if (endpointSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else {
      // Development fallback – trust the payload
      event = JSON.parse(req.body);
    }
  } catch (err) {
    console.error('Webhook signature verification failed.', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata?.order_id;
    if (orderId) {
      await supabaseAdmin
        .from('orders')
        .update({ payment_status: 'paid', status: 'processing' })
        .eq('id', orderId);
    }
  }
  res.json({ received: true });
});

module.exports = router;
