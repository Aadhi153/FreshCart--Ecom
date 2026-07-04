const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../supabaseClient');
const { requireAdmin } = require('../middleware/auth');

// GET /api/analytics/summary — admin only
router.get('/summary', requireAdmin, async (_req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    const weekAgoISO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: todayOrders },
      { data: todayRevData },
      { count: totalCustomers },
      { data: lowStock },
      { data: recentOrdersData },
      { data: weeklyOrders },
      { data: topProducts },
      { data: allOrdersData },
    ] = await Promise.all([
      supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
      supabaseAdmin.from('orders').select('total_amount').gte('created_at', todayISO),
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('products').select('id, name').eq('in_stock', false),
      supabaseAdmin.from('orders').select('id, status, total_amount, created_at, profiles(full_name, email)').order('created_at', { ascending: false }).limit(5),
      supabaseAdmin.from('orders').select('created_at, total_amount').gte('created_at', weekAgoISO),
      supabaseAdmin.from('order_items').select('product_id, quantity, products(name)').limit(1000),
      supabaseAdmin.from('orders').select('total_amount, status'),
    ]);

    const todayRevenue = (todayRevData || []).reduce((sum, o) => sum + parseFloat(o.total_amount), 0);
    const recentOrders = recentOrdersData || [];

    const nonCancelledOrders = (allOrdersData || []).filter(o => o.status !== 'cancelled');
    const totalRevenue = nonCancelledOrders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0);
    const totalOrders = nonCancelledOrders.length;

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const revenueByDay = {};
    (weeklyOrders || []).forEach((o) => {
      const day = days[new Date(o.created_at).getDay()];
      revenueByDay[day] = (revenueByDay[day] || 0) + parseFloat(o.total_amount);
    });
    const chartData = days.map(day => ({ name: day, revenue: revenueByDay[day] || 0 }));

    // Aggregate top products manually
    const productSales = {};
    (topProducts || []).forEach(item => {
      if (!item.product_id || !item.products) return;
      const pid = item.product_id;
      if (!productSales[pid]) {
        productSales[pid] = { name: item.products.name, total_quantity: 0 };
      }
      productSales[pid].total_quantity += item.quantity;
    });
    const aggregatedTopProducts = Object.values(productSales)
      .sort((a, b) => b.total_quantity - a.total_quantity)
      .slice(0, 5);

    res.json({
      kpis: {
        todayRevenue: todayRevenue.toFixed(2),
        todayOrders,
        totalCustomers,
        outOfStockCount: (lowStock || []).length,
        totalRevenue: totalRevenue.toFixed(2),
        totalOrders,
      },
      recentOrders: recentOrders || [],
      outOfStockItems: lowStock || [],
      weeklyRevenueChart: chartData,
      topProducts: aggregatedTopProducts,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
