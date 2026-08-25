import { useState, useEffect } from 'react';
import type { CSSProperties, ElementType } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { TrendingUp, ShoppingBag, Users, AlertTriangle, RefreshCw } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';
import { getAnalyticsSummary } from '../lib/api';

// Counts up from 0 to `value` whenever it changes, instead of the number
// just popping in — reads much less "static spreadsheet" on a KPI row.
function AnimatedNumber({ value, prefix = '', decimals = 0 }: { value: number; prefix?: string; decimals?: number }) {
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })),
    });
    return controls.stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{prefix}{display}</>;
}

const kpiContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const kpiItemVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] as const } },
};

const statusStyle: Record<string, CSSProperties> = {
  delivered:  { background: 'var(--success-tint)', color: 'var(--success)' },
  processing: { background: 'var(--warning-tint)', color: 'var(--warning)' },
  placed:     { background: 'var(--info-tint)',    color: 'var(--info)' },
  packed:     { background: 'var(--info-tint)',    color: 'var(--info)' },
  shipped:    { background: 'var(--accent-tint)',  color: 'var(--accent)' },
  cancelled:  { background: 'var(--danger-tint)',  color: 'var(--danger)' },
};

interface KPI {
  label: string;
  value: number;
  prefix?: string;
  decimals?: number;
  change: string;
  icon: ElementType;
  color: string;
}

interface RecentOrder {
  id: string;
  // orders.user_id -> profiles.id is a many-to-one FK, so PostgREST always
  // returns this joined relation as a single object, never an array.
  profiles?: { full_name?: string; email?: string };
  total_amount: number;
  status: string;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [kpiCards, setKpiCards] = useState<KPI[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [chartData, setChartData] = useState<{ name: string; revenue: number }[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const data = await getAnalyticsSummary();
      const { kpis, recentOrders, outOfStockItems, weeklyRevenueChart, topProducts } = data;

      setKpiCards([
        { label: 'Total Revenue',   value: Number(kpis.totalRevenue) || 0, prefix: '₹', decimals: 2, change: 'All-time', icon: TrendingUp,    color: 'var(--success)' },
        { label: 'Total Orders',    value: Number(kpis.totalOrders) || 0,  change: 'All-time', icon: ShoppingBag, color: 'var(--accent)' },
        { label: 'Revenue Today',   value: Number(kpis.todayRevenue) || 0, prefix: '₹', decimals: 2, change: 'Live', icon: TrendingUp,    color: 'var(--success)' },
        { label: 'Orders Today',    value: Number(kpis.todayOrders) || 0,       change: 'Live',    icon: ShoppingBag,   color: 'var(--accent)' },
        { label: 'Total Customers', value: Number(kpis.totalCustomers) || 0,    change: 'Total',   icon: Users,         color: 'var(--info)' },
        { label: 'Low Stock Items', value: Number(kpis.outOfStockCount) || 0, change: 'Alert',  icon: AlertTriangle, color: 'var(--danger)' },
      ]);

      setLowStockItems(outOfStockItems || []);
      setRecentOrders(recentOrders || []);
      setChartData(weeklyRevenueChart || []);
      setTopProducts(topProducts || []);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchDashboardData(); }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>Dashboard</h1>
          <p style={{ margin: '0.3rem 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            Live data from your Supabase database.
          </p>
        </div>
        <motion.button
          onClick={fetchDashboardData}
          disabled={loading}
          whileHover={{ y: -1, boxShadow: '0 6px 16px rgba(99,102,241,0.32)' }}
          whileTap={{ scale: 0.96 }}
          style={{
            padding: '0.5rem 1.1rem',
            background: 'var(--gradient-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            opacity: loading ? 0.7 : 1,
          }}
        >
          <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
        </motion.button>
      </motion.div>

      {/* KPI Grid */}
      <motion.div className="kpi-grid" variants={kpiContainerVariants} initial="hidden" animate="visible">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="kpi-card spatial-card" style={{ opacity: 0.5 }}>
              <div style={{ height: 80, background: 'var(--border-subtle)', borderRadius: 'var(--radius-sm)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            </div>
          ))
        ) : (
          kpiCards.map(({ label, value, prefix, decimals, change, icon: Icon, color }) => (
            <motion.div key={label} className="kpi-card spatial-card" variants={kpiItemVariants}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                <p className="kpi-title">{label}</p>
                <div className="kpi-icon-badge" style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: `color-mix(in srgb, ${color} 16%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={14} style={{ color }} />
                </div>
              </div>
              <h3 className="kpi-value"><AnimatedNumber value={value} prefix={prefix} decimals={decimals ?? 0} /></h3>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.7rem', fontWeight: 600, color: change === 'Alert' ? 'var(--danger)' : change === 'Live' ? 'var(--success)' : 'var(--text-secondary)' }}>
                {change === 'Live' ? '🟢 Live' : change === 'Alert' && (lowStockItems.length > 0) ? '⚠️ Needs attention' : change}
              </p>
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Revenue Chart */}
      <motion.div
        className="spatial-card"
        style={{ padding: '1.25rem' }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
      >
        <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 700 }}>Revenue — Last 7 Days</h3>
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--chart-line)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--chart-line)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis stroke="var(--text-muted)" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }}
                formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, 'Revenue']}
              />
              <Area type="monotone" dataKey="revenue" stroke="var(--chart-line)" strokeWidth={2.5} fill="url(#revenueGrad)"
                dot={{ r: 4, fill: 'var(--chart-line)', strokeWidth: 0 }} activeDot={{ r: 6, fill: 'var(--chart-line)' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Grid for Recent Orders and Top Products */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Recent Orders */}
        <motion.div
          className="spatial-card"
          style={{ padding: '1.25rem' }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.22 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Recent Orders</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}>View all →</span>
          </div>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading...</td></tr>
                ) : recentOrders.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No orders yet.</td></tr>
                ) : (
                  recentOrders.map(order => (
                    <tr key={order.id}>
                      <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                        #{order.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td>{order.profiles?.full_name || order.profiles?.email || 'Unknown'}</td>
                      <td style={{ fontWeight: 600 }}>₹{parseFloat(String(order.total_amount)).toFixed(2)}</td>
                      <td>
                        <span style={{ ...(statusStyle[order.status] || {}), padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'capitalize', display: 'inline-block' }}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Top Selling Products */}
        <motion.div
          className="spatial-card"
          style={{ padding: '1.25rem' }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.28 }}
        >
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 700 }}>Top Selling Products</h3>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical" margin={{ left: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                <XAxis type="number" stroke="var(--text-muted)" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="var(--text-muted)" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }}
                  formatter={(value: any) => [value, 'Items Sold']}
                />
                <Bar dataKey="total_quantity" fill="var(--info)" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <motion.div
          className="spatial-card"
          style={{ padding: '1.25rem', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)' }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.34 }}
        >
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 700, color: 'var(--danger)' }}>
            ⚠️ Low Stock Alerts
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {lowStockItems.map(item => (
              <motion.div
                key={item.id}
                whileHover={{ x: 4 }}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--danger-tint)', borderRadius: 'var(--radius-sm)' }}
              >
                <span style={{ fontWeight: 500 }}>{item.name}</span>
                <span style={{ color: 'var(--danger)', fontWeight: 700, fontSize: '0.85rem' }}>
                  {!item.in_stock || !item.stock_quantity ? 'Out of stock' : `${item.stock_quantity} left`}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
