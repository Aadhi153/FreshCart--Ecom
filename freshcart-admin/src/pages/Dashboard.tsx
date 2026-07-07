import { useState, useEffect } from 'react';
import type { CSSProperties, ElementType } from 'react';
import { TrendingUp, ShoppingBag, Users, AlertTriangle, RefreshCw } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';
import { getAnalyticsSummary } from '../lib/api';

const statusStyle: Record<string, CSSProperties> = {
  delivered:  { background: 'rgba(74,222,128,0.15)', color: '#4ADE80' },
  processing: { background: 'rgba(251,146,60,0.15)', color: '#FB923C' },
  placed:     { background: 'rgba(251,191,36,0.15)', color: '#FBBF24' },
  packed:     { background: 'rgba(251,191,36,0.15)', color: '#FBBF24' },
  shipped:    { background: 'rgba(56,189,248,0.15)', color: '#38BDF8' },
  cancelled:  { background: 'rgba(248,113,113,0.15)', color: '#F87171' },
};

interface KPI {
  label: string;
  value: string;
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
        { label: 'Total Revenue',   value: `₹${kpis.totalRevenue}`, change: 'All-time', icon: TrendingUp,    color: 'var(--success)' },
        { label: 'Total Orders',    value: String(kpis.totalOrders ?? 0), change: 'All-time', icon: ShoppingBag, color: 'var(--primary)' },
        { label: 'Revenue Today',   value: `₹${kpis.todayRevenue}`, change: 'Live',    icon: TrendingUp,    color: 'var(--success)' },
        { label: 'Orders Today',    value: String(kpis.todayOrders ?? 0),       change: 'Live',    icon: ShoppingBag,   color: 'var(--primary)' },
        { label: 'Total Customers', value: String(kpis.totalCustomers ?? 0),    change: 'Total',   icon: Users,         color: 'var(--accent)' },
        { label: 'Low Stock Items', value: String(kpis.outOfStockCount ?? 0), change: 'Alert',  icon: AlertTriangle, color: 'var(--danger)' },
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>Dashboard</h1>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Live data from your Supabase database.
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
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
        </button>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="kpi-card spatial-card" style={{ opacity: 0.5 }}>
              <div style={{ height: 80, background: 'var(--border-subtle)', borderRadius: 'var(--radius-sm)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            </div>
          ))
        ) : (
          kpiCards.map(({ label, value, change, icon: Icon, color }) => (
            <div key={label} className="kpi-card spatial-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <p className="kpi-title">{label}</p>
                <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} style={{ color }} />
                </div>
              </div>
              <h3 className="kpi-value">{value}</h3>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.78rem', fontWeight: 600, color: change === 'Alert' ? 'var(--danger)' : change === 'Live' ? 'var(--success)' : 'var(--text-secondary)' }}>
                {change === 'Live' ? '🟢 Live' : change === 'Alert' && (lowStockItems.length > 0) ? '⚠️ Needs attention' : change}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Revenue Chart */}
      <div className="spatial-card" style={{ padding: '1.75rem' }}>
        <h3 style={{ margin: '0 0 1.5rem', fontSize: '1rem', fontWeight: 700 }}>Revenue — Last 7 Days</h3>
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--primary)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis stroke="var(--text-muted)" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--layer-0)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }}
                formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, 'Revenue']}
              />
              <Area type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2.5} fill="url(#revenueGrad)"
                dot={{ r: 4, fill: 'var(--primary)', strokeWidth: 0 }} activeDot={{ r: 6, fill: 'var(--primary)' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid for Recent Orders and Top Products */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Recent Orders */}
        <div className="spatial-card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Recent Orders</h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}>View all →</span>
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
        </div>

        {/* Top Selling Products */}
        <div className="spatial-card" style={{ padding: '1.75rem' }}>
          <h3 style={{ margin: '0 0 1.5rem', fontSize: '1rem', fontWeight: 700 }}>Top Selling Products</h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical" margin={{ left: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                <XAxis type="number" stroke="var(--text-muted)" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="var(--text-muted)" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--layer-0)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }}
                  formatter={(value: any) => [value, 'Items Sold']}
                />
                <Bar dataKey="total_quantity" fill="var(--accent)" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="spatial-card" style={{ padding: '1.75rem', border: '1px solid rgba(248,113,113,0.3)' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: 'var(--danger)' }}>
            ⚠️ Low Stock Alerts
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {lowStockItems.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(248,113,113,0.05)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontWeight: 500 }}>{item.name}</span>
                <span style={{ color: 'var(--danger)', fontWeight: 700, fontSize: '0.85rem' }}>
                  {!item.in_stock || !item.stock_quantity ? 'Out of stock' : `${item.stock_quantity} left`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
