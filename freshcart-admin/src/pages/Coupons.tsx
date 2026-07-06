import { useState, useEffect, useMemo } from 'react';
import CouponFormModal from '../components/CouponFormModal';
import { getCoupons, deleteCoupon } from '../lib/api';
import type { Coupon } from '@freshcart/types';
import { Edit2, Trash2, Plus, RefreshCw, Search, Tag } from 'lucide-react';
import { useToast } from '../components/ToastProvider';

export default function Coupons() {
  const { showToast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  useEffect(() => {
    fetchCoupons();
  }, []);

  async function fetchCoupons() {
    try {
      setLoading(true);
      const data = await getCoupons();
      setCoupons(data);
    } catch (error) {
      console.error('Error fetching coupons:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenModal = (coupon?: Coupon) => {
    setEditingCoupon(coupon ?? null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => { setIsModalOpen(false); setEditingCoupon(null); };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this coupon permanently?')) return;
    try {
      await deleteCoupon(id);
      setCoupons(prev => prev.filter(c => c.id !== id));
      showToast('Coupon deleted', 'success');
    } catch (error) {
      console.error('Error deleting coupon:', error);
      showToast('Failed to delete coupon.', 'error');
    }
  };

  const filteredCoupons = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return coupons;
    return coupons.filter(c => c.code.toLowerCase().includes(q));
  }, [coupons, searchQuery]);

  const isExpired = (c: Coupon) => !!c.expires_at && new Date(c.expires_at) < new Date();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Coupons</h1>
          <p style={{ margin: '0.3rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {coupons.length} coupon{coupons.length !== 1 ? 's' : ''} in database
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchCoupons} disabled={loading} style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--layer-1)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
            <RefreshCw size={14} />
          </button>
          <button onClick={() => handleOpenModal()} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} /> Add Coupon
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.1rem' }}
            placeholder="Search coupon codes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="spatial-card" style={{ padding: '1.5rem' }}>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Min Order</th>
                <th>Expires</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Loading coupons...</td></tr>
              ) : filteredCoupons.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  {coupons.length === 0 ? 'No coupons yet. Add your first one!' : 'No coupons match your search.'}
                </td></tr>
              ) : (
                filteredCoupons.map(c => (
                  <tr key={c.id}>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, letterSpacing: '0.02em' }}>
                        <Tag size={14} style={{ color: 'var(--primary)' }} /> {c.code}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {c.discount_type === 'flat' ? `₹${c.discount_value.toFixed(2)} off` : `${c.discount_value}% off`}
                      {c.discount_type === 'percent' && c.max_discount_amount != null && (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}> (cap ₹{c.max_discount_amount.toFixed(2)})</span>
                      )}
                    </td>
                    <td>{c.min_order_amount > 0 ? `₹${c.min_order_amount.toFixed(2)}` : '—'}</td>
                    <td>{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'Never'}</td>
                    <td>
                      <span style={{
                        color: c.active && !isExpired(c) ? 'var(--success)' : 'var(--danger)',
                        backgroundColor: c.active && !isExpired(c) ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
                        padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700,
                      }}>
                        {isExpired(c) ? 'Expired' : c.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button onClick={() => handleOpenModal(c)} style={{ padding: '0.4rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(c.id!)} style={{ padding: '0.4rem', background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CouponFormModal
        isOpen={isModalOpen}
        editingCoupon={editingCoupon}
        onClose={handleCloseModal}
        onSaved={async () => { await fetchCoupons(); handleCloseModal(); }}
      />
    </div>
  );
}
