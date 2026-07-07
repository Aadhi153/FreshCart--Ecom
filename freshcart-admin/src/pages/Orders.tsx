import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw, ChevronDown, ChevronRight, Download } from 'lucide-react';
import { statusColors } from '../lib/orderStatus';
import { useToast } from '../components/ToastProvider';
import { exportToCsv } from '../lib/csv';

export default function Orders() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { fetchOrders(); }, []);

  useEffect(() => {
    let result = orders;
    if (statusFilter !== 'all') result = result.filter(o => o.status === statusFilter);
    if (search) result = result.filter(o =>
      o.id.includes(search) ||
      (o.profiles?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.profiles?.email || '').toLowerCase().includes(search.toLowerCase())
    );
    setFiltered(result);
  }, [orders, search, statusFilter]);

  async function fetchOrders() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, profiles(full_name, email, phone), order_items(quantity, price_at_time, products(name))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(id: string, newStatus: string) {
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
      showToast('Order status updated', 'success');
    } catch (err) {
      console.error('Error updating order status:', err);
      showToast('Failed to update order status', 'error');
    } finally {
      setUpdatingId(null);
    }
  }

  const stats = useMemo(() => {
    const total = orders.length;
    const inProgress = orders.filter(o => ['placed', 'packed', 'shipped'].includes(o.status)).length;
    const delivered = orders.filter(o => o.status === 'delivered').length;
    const cancelled = orders.filter(o => o.status === 'cancelled').length;
    return { total, inProgress, delivered, cancelled };
  }, [orders]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Orders Management</h1>
          <p style={{ margin: '0.3rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {filtered.length} order{filtered.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={fetchOrders}
            disabled={loading}
            style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--layer-1)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={() => exportToCsv('orders.csv', filtered.map(o => ({
              OrderId: o.id, Customer: o.profiles?.full_name || '', Total: o.total_amount, Status: o.status, Date: o.created_at, Slot: o.delivery_slot || '',
            })))}
            style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--layer-1)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card spatial-card">
          <p className="kpi-title">Total Orders</p>
          <h3 className="kpi-value">{stats.total}</h3>
        </div>
        <div className="kpi-card spatial-card">
          <p className="kpi-title">In Progress</p>
          <h3 className="kpi-value">{stats.inProgress}</h3>
        </div>
        <div className="kpi-card spatial-card">
          <p className="kpi-title">Delivered</p>
          <h3 className="kpi-value">{stats.delivered}</h3>
        </div>
        <div className="kpi-card spatial-card">
          <p className="kpi-title">Cancelled</p>
          <h3 className="kpi-value">{stats.cancelled}</h3>
        </div>
      </div>

      <div className="spatial-card" style={{ padding: '1.5rem' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by ID, name, or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200, padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--layer-0)', color: 'var(--text-primary)' }}
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--layer-0)', color: 'var(--text-primary)' }}
          >
            <option value="all">All Statuses</option>
            <option value="placed">Placed</option>
            <option value="packed">Packed</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 30 }} />
                <th>Order ID</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Loading orders...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No orders found.</td></tr>
              ) : (
                filtered.map(o => (
                  <React.Fragment key={o.id}>
                  <tr style={{ opacity: updatingId === o.id ? 0.6 : 1 }}>
                    <td>
                      <button onClick={() => setExpandedId(prev => prev === o.id ? null : o.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}>
                        {expandedId === o.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    </td>
                    <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                      #{o.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{o.profiles?.full_name || 'Guest'}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{o.profiles?.email || o.profiles?.phone || ''}</div>
                    </td>
                    <td style={{ fontSize: '0.82rem' }}>
                      {(o.order_items || []).length} item{o.order_items?.length !== 1 ? 's' : ''}
                    </td>
                    <td style={{ fontWeight: 600 }}>₹{Number(o.total_amount).toFixed(2)}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td>
                      <select
                        value={o.status}
                        onChange={e => handleStatusChange(o.id, e.target.value)}
                        disabled={updatingId === o.id}
                        style={{
                          ...(statusColors[o.status] || {}),
                          padding: '5px 8px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          border: 'none',
                          cursor: 'pointer',
                          outline: 'none',
                          textTransform: 'capitalize',
                        }}
                      >
                        <option value="placed">Placed</option>
                        <option value="packed">Packed</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                  {expandedId === o.id && (
                    <tr>
                      <td colSpan={7} style={{ background: 'var(--layer-1)', padding: '1rem 1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                          {(o.order_items || []).map((item: any, i: number) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>{item.products?.name || 'Unknown item'} × {item.quantity}</span>
                              <span>₹{Number(item.price_at_time).toFixed(2)}</span>
                            </div>
                          ))}
                          <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.4rem', paddingTop: '0.4rem' }}>
                            <strong>Deliver to:</strong> {typeof o.delivery_address === 'object' && o.delivery_address
                              ? `${o.delivery_address?.fullName}, ${o.delivery_address?.line1}, ${o.delivery_address?.city} - ${o.delivery_address?.pincode}`
                              : String(o.delivery_address || '—')}
                          </div>
                          {o.delivery_slot && (
                            <div><strong>Slot:</strong> {o.delivery_slot}</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
