import { useState, useEffect, useMemo } from 'react';
import PromotionFormModal from '../components/PromotionFormModal';
import { getPromotions, updatePromotion, deletePromotion } from '../lib/api';
import type { Promotion } from '@freshcart/types';
import { Edit2, Trash2, Plus, RefreshCw, Search, Tag } from 'lucide-react';
import { useToast } from '../components/ToastProvider';

export default function Promotions() {
  const { showToast } = useToast();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);

  useEffect(() => {
    fetchPromotions();
  }, []);

  async function fetchPromotions() {
    try {
      setLoading(true);
      const data = await getPromotions();
      setPromotions(data);
    } catch (error) {
      console.error('Error fetching promotions:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenModal = (promotion?: Promotion) => {
    setEditingPromotion(promotion ?? null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => { setIsModalOpen(false); setEditingPromotion(null); };

  const handleToggleActive = async (promotion: Promotion) => {
    try {
      const updated = await updatePromotion(promotion.id!, { is_active: !promotion.is_active });
      setPromotions(prev => prev.map(p => (p.id === promotion.id ? { ...p, ...updated } : p)));
    } catch (error) {
      console.error('Error toggling promotion:', error);
      showToast('Failed to update promotion status.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this promotion permanently?')) return;
    try {
      await deletePromotion(id);
      setPromotions(prev => prev.filter(p => p.id !== id));
      showToast('Promotion deleted', 'success');
    } catch (error) {
      console.error('Error deleting promotion:', error);
      showToast(error instanceof Error ? error.message : 'Failed to delete promotion.', 'error');
    }
  };

  const filteredPromotions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return promotions;
    return promotions.filter(p => p.name.toLowerCase().includes(q) || (p.code ?? '').toLowerCase().includes(q));
  }, [promotions, searchQuery]);

  const isExpired = (p: Promotion) => !!p.valid_until && new Date(p.valid_until) < new Date();

  const discountLabel = (p: Promotion) => {
    if (p.discount_type === 'flat') return `₹${p.discount_value.toFixed(2)} off`;
    if (p.discount_type === 'percentage') {
      return `${p.discount_value}% off${p.max_discount_amount != null ? ` (cap ₹${p.max_discount_amount.toFixed(2)})` : ''}`;
    }
    return 'BOGO';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Promotions</h1>
          <p style={{ margin: '0.3rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {promotions.length} promotion{promotions.length !== 1 ? 's' : ''} in database
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchPromotions} disabled={loading} style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--layer-1)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
            <RefreshCw size={14} />
          </button>
          <button onClick={() => handleOpenModal()} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} /> Add Promotion
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
            placeholder="Search name or code..."
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
                <th>Name</th>
                <th>Code</th>
                <th>Type</th>
                <th>Discount</th>
                <th>Scope</th>
                <th>Status</th>
                <th>Redemptions</th>
                <th>Valid dates</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>Loading promotions...</td></tr>
              ) : filteredPromotions.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  {promotions.length === 0 ? 'No promotions yet. Add your first one!' : 'No promotions match your search.'}
                </td></tr>
              ) : (
                filteredPromotions.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>
                      {p.requires_code ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, letterSpacing: '0.02em' }}>
                          <Tag size={14} style={{ color: 'var(--primary)' }} /> {p.code}
                        </span>
                      ) : (
                        <span className="badge badge-info">Auto</span>
                      )}
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{p.discount_type}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{discountLabel(p)}</td>
                    <td style={{ textTransform: 'capitalize' }}>{p.applicable_scope}</td>
                    <td>
                      <button
                        onClick={() => handleToggleActive(p)}
                        style={{
                          border: 'none', cursor: 'pointer', padding: '4px 10px', borderRadius: 'var(--radius-full)',
                          fontSize: '0.75rem', fontWeight: 700,
                          color: p.is_active && !isExpired(p) ? 'var(--success)' : 'var(--danger)',
                          backgroundColor: p.is_active && !isExpired(p)
                            ? 'color-mix(in srgb, var(--success) 15%, transparent)'
                            : 'color-mix(in srgb, var(--danger) 15%, transparent)',
                        }}
                      >
                        {isExpired(p) ? 'Expired' : p.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td>{p.redemption_count ?? 0} / {p.usage_limit_total ?? '∞'}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {p.valid_from ? new Date(p.valid_from).toLocaleDateString() : '—'} – {p.valid_until ? new Date(p.valid_until).toLocaleDateString() : 'Never'}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button onClick={() => handleOpenModal(p)} style={{ padding: '0.4rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(p.id!)} style={{ padding: '0.4rem', background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
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

      <PromotionFormModal
        isOpen={isModalOpen}
        editingPromotion={editingPromotion}
        onClose={handleCloseModal}
        onSaved={async () => { await fetchPromotions(); handleCloseModal(); }}
      />
    </div>
  );
}
