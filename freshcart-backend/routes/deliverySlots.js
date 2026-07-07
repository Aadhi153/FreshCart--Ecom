const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../supabaseClient');
const { requireAuth } = require('../middleware/auth');
const { DELIVERY_SLOT_WINDOWS, DELIVERY_SLOT_MAX_ORDERS_PER_WINDOW } = require('@freshcart/types');
const { getUpcomingDates, isSlotBookable } = require('../lib/deliverySlots');

// GET /api/delivery-slots — availability for the next few days, grouped by day
router.get('/', requireAuth, async (_req, res) => {
  try {
    const dates = getUpcomingDates();

    // Single query for the whole horizon rather than one per slot.
    const { data: existingOrders, error } = await supabaseAdmin
      .from('orders')
      .select('delivery_slot_date, delivery_slot_window')
      .gte('delivery_slot_date', dates[0])
      .lte('delivery_slot_date', dates[dates.length - 1])
      .neq('status', 'cancelled');
    if (error) throw error;

    const countByKey = new Map();
    for (const order of existingOrders || []) {
      if (!order.delivery_slot_date || !order.delivery_slot_window) continue;
      const key = `${order.delivery_slot_date}|${order.delivery_slot_window}`;
      countByKey.set(key, (countByKey.get(key) || 0) + 1);
    }

    const days = dates.map((date) => ({
      date,
      windows: DELIVERY_SLOT_WINDOWS.map((window) => {
        const count = countByKey.get(`${date}|${window.id}`) || 0;
        const remaining = Math.max(0, DELIVERY_SLOT_MAX_ORDERS_PER_WINDOW - count);
        return {
          id: window.id,
          label: window.label,
          remaining,
          available: isSlotBookable(date, window.id) && remaining > 0,
        };
      }),
    }));

    res.json(days);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
