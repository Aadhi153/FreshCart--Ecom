import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw, Search, Eye, Download } from 'lucide-react';
import Modal from '../components/Modal';
import { statusColors } from '../lib/orderStatus';
import { useToast } from '../components/ToastProvider';
import { exportToCsv } from '../lib/csv';

export default function Customers() {
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ordersByUser, setOrdersByUser] = useState<Record<string, any[]>>({});
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  useEffect(() => { fetchCustomers(); fetchOrderCounts(); }, []);

  useEffect(() => {
    if (!search) { setFiltered(customers); return; }
    setFiltered(customers.filter(c =>
      (c.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || '').includes(search)
    ));
  }, [search, customers]);

  async function fetchCustomers() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
      showToast('Failed to load customers', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function fetchOrderCounts() {
    try {
      const { data, error } = await supabase.from('orders').select('id, user_id, status, total_amount, created_at');
      if (error) throw error;
      const grouped: Record<string, any[]> = {};
      (data || []).forEach(o => {
        if (!o.user_id) return;
        (grouped[o.user_id] ||= []).push(o);
      });
      setOrdersByUser(grouped);
    } catch (err) {
      console.error('Error fetching order counts:', err);
    }
  }

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return {
      total: customers.length,
      newThisWeek: customers.filter(c => new Date(c.created_at).getTime() >= weekAgo).length,
      admins: customers.filter(c => c.role === 'admin').length,
    };
  }, [customers]);

  const avatarColor = (name: string) => {
    const colors = ['#4ADE80', '#38BDF8', '#FB923C', '#A78BFA', '#F472B6', '#FBBF24'];
    return colors[(name?.charCodeAt(0) || 0) % colors.length];
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Customers</h1>
          <p style={{ margin: '0.3rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {filtered.length} customer{filtered.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={fetchCustomers}
            disabled={loading}
            style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--layer-1)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={() => exportToCsv('customers.csv', filtered.map(c => ({
              Name: c.full_name || '', Email: c.email || '', Phone: c.phone || '', Role: c.role, Orders: (ordersByUser[c.id] || []).length, Joined: c.created_at,
            })))}
            style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--layer-1)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card spatial-card">
          <p className="kpi-title">Total Customers</p>
          <h3 className="kpi-value">{stats.total}</h3>
        </div>
        <div className="kpi-card spatial-card">
          <p className="kpi-title">New This Week</p>
          <h3 className="kpi-value">{stats.newThisWeek}</h3>
        </div>
        <div className="kpi-card spatial-card">
          <p className="kpi-title">Total Admins</p>
          <h3 className="kpi-value">{stats.admins}</h3>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '0.55rem 1rem 0.55rem 2.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--layer-0)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      <div className="spatial-card" style={{ padding: '1.5rem' }}>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Avatar</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th style={{ textAlign: 'center' }}>Orders</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>Loading customers...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  {search ? 'No customers match your search.' : 'No customers yet.'}
                </td></tr>
              ) : (
                filtered.map(c => {
                  const initials = (c.full_name || c.email || 'U').slice(0, 2).toUpperCase();
                  const color = avatarColor(c.full_name || c.email || '');
                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{
                          width: 38, height: 38, borderRadius: '50%',
                          background: `${color}22`, border: `2px solid ${color}`,
                          color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: '0.85rem',
                        }}>
                          {initials}
                        </div>
                      </td>
                      <td style={{ fontWeight: 500 }}>{c.full_name || '—'}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{c.email || '—'}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{c.phone || '—'}</td>
                      <td>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          textTransform: 'capitalize',
                          background: c.role === 'admin' ? 'rgba(167,139,250,0.15)' : 'rgba(74,222,128,0.12)',
                          color: c.role === 'admin' ? '#A78BFA' : '#4ADE80',
                        }}>
                          {c.role}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>{(ordersByUser[c.id] || []).length}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td>
                        <button onClick={() => setSelectedCustomer(c)} title="View Details" style={{ padding: '6px', cursor: 'pointer', background: 'var(--primary-light)', border: '1px solid var(--border-color)', color: 'var(--primary)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center' }}>
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!selectedCustomer} onClose={() => setSelectedCustomer(null)} title={selectedCustomer?.full_name || 'Customer Details'}>
        {selectedCustomer && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div><strong>Email:</strong> {selectedCustomer.email || '—'}</div>
            <div><strong>Phone:</strong> {selectedCustomer.phone || '—'}</div>
            <div><strong>Role:</strong> {selectedCustomer.role}</div>
            <div><strong>Joined:</strong> {new Date(selectedCustomer.created_at).toLocaleDateString()}</div>
            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />
            <h4 style={{ margin: 0 }}>Order History</h4>
            {(ordersByUser[selectedCustomer.id] || []).length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No orders yet.</p>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead><tr><th>Order</th><th>Date</th><th>Total</th><th>Status</th></tr></thead>
                  <tbody>
                    {ordersByUser[selectedCustomer.id].map(o => (
                      <tr key={o.id}>
                        <td>#{o.id.slice(0, 8).toUpperCase()}</td>
                        <td>{new Date(o.created_at).toLocaleDateString()}</td>
                        <td>₹{Number(o.total_amount).toFixed(2)}</td>
                        <td>
                          <span style={{ ...(statusColors[o.status] || {}), padding: '3px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize' }}>
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
