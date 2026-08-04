import { useEffect, useState } from 'react';
import Modal from './Modal';
import { getPromotionPerformance } from '../lib/api';
import type { PromotionPerformance } from '../lib/api';

interface PromotionPerformanceModalProps {
  promotionId: string | null;
  onClose: () => void;
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '0.9rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--layer-1)', border: '1px solid var(--border-color)' }}>
      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</p>
      <p style={{ margin: '0.25rem 0 0', fontSize: '1.25rem', fontWeight: 800 }}>{value}</p>
    </div>
  );
}

export default function PromotionPerformanceModal({ promotionId, onClose }: PromotionPerformanceModalProps) {
  const [data, setData] = useState<PromotionPerformance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!promotionId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError('');
    getPromotionPerformance(promotionId)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load performance.'))
      .finally(() => setLoading(false));
  }, [promotionId]);

  const netImpact = data ? data.kpis.revenueFromOrders - data.kpis.totalDiscountGiven : 0;

  return (
    <Modal isOpen={promotionId != null} onClose={onClose} title={data ? `Performance — ${data.promotion.name}` : 'Promotion Performance'}>
      {loading && <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>}
      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
      {data && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Kpi label="Redemptions" value={String(data.kpis.totalRedemptions)} />
            <Kpi label="Unique Customers" value={String(data.kpis.uniqueCustomers)} />
            <Kpi label="Discount Given" value={`₹${data.kpis.totalDiscountGiven.toFixed(2)}`} />
            <Kpi label="Revenue" value={`₹${data.kpis.revenueFromOrders.toFixed(2)}`} />
            <Kpi label="Avg Order Value" value={`₹${data.kpis.averageOrderValue.toFixed(2)}`} />
            <Kpi label="Net Impact" value={`${netImpact >= 0 ? '+' : ''}₹${netImpact.toFixed(2)}`} />
          </div>

          <h3 style={{ margin: '0 0 0.6rem', fontSize: '0.95rem' }}>Redemption History</h3>
          {data.redemptions.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No redemptions yet.</p>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Discount</th>
                    <th>Order Total</th>
                    <th>Status</th>
                    <th>Redeemed At</th>
                  </tr>
                </thead>
                <tbody>
                  {data.redemptions.map((r) => (
                    <tr key={r.id}>
                      <td>{r.customer_name}</td>
                      <td>₹{Number(r.discount_amount_applied).toFixed(2)}</td>
                      <td>{r.order_total != null ? `₹${Number(r.order_total).toFixed(2)}` : '—'}</td>
                      <td style={{ textTransform: 'capitalize' }}>{r.order_status ?? '—'}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(r.redeemed_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
