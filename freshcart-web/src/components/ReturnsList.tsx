'use client';

import { useEffect, useState } from 'react';
import { Package, CornerUpLeft } from 'lucide-react';
import type { ReturnRequest } from '@freshcart/types';
import { getMyReturnRequests } from '../lib/api';
import { EmptyState, Skeleton } from './Skeleton';
import { ReturnTimeline } from './ReturnTimeline';
import { AccountCard } from './AccountCard';
import { AccountThumbnail } from './AccountThumbnail';
import { StatusBadge } from './StatusBadge';
import styles from './OrdersDetails.module.css';

// Lucide has no single "package being returned" glyph — a Package base with a small
// corner return-arrow badge (same composition pattern as the avatar camera badge in
// ProfileDetails.tsx) reads unambiguously as "returns," unlike a generic refresh icon.
function ReturnsIcon({ size = 24 }: { size?: number }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <Package size={size} />
      <span
        style={{
          position: 'absolute',
          bottom: -4,
          right: -4,
          width: size * 0.58,
          height: size * 0.58,
          borderRadius: '50%',
          background: 'var(--layer-0)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CornerUpLeft size={size * 0.36} />
      </span>
    </span>
  );
}

export function ReturnsList() {
  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyReturnRequests()
      .then(setRequests)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load return requests.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={styles.list}>
        {[0, 1].map((i) => (
          <div key={i} className={styles.skeletonCard}>
            <Skeleton style={{ width: '35%', height: '1rem' }} />
            <Skeleton style={{ width: '55%', height: '0.85rem' }} />
            <Skeleton style={{ width: '100%', height: '2.2rem' }} />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <p style={{ color: '#B91C1C', fontWeight: 600 }}>{error}</p>;
  }

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={<ReturnsIcon size={24} />}
        heading="No return or replacement requests"
        subtext="Requests you submit from a delivered order will show up here."
      />
    );
  }

  return (
    <div className={styles.list}>
      {requests.map((req) => {
        const item = req.order_items as { products?: { name: string; image_url: string | null }; quantity?: number; price_at_time?: number } | undefined;
        const productName = item?.products?.name || 'Item';

        return (
          <AccountCard key={req.id} hoverable>
            <div className={styles.cardTop}>
              <strong className={styles.orderId}>
                {req.type === 'replace' ? 'Replacement' : 'Return'} · #{req.order_id?.slice(0, 8).toUpperCase()}
              </strong>
              <StatusBadge kind="return" status={req.status || 'requested'} />
            </div>

            <div className={styles.itemRow} style={{ marginBottom: '0.6rem' }}>
              <AccountThumbnail src={item?.products?.image_url} alt={productName} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className={styles.itemName}>{productName}</p>
                <p className={styles.itemQty}>
                  Qty {item?.quantity ?? 1} &middot; Reason: {req.reason}
                  {req.type === 'return' && req.refund_method && ` · Refund via ${req.refund_method === 'store_credit' ? 'store credit' : 'original payment'}`}
                </p>
              </div>
            </div>

            <ReturnTimeline status={req.status || 'requested'} />

            {req.status === 'completed' && req.type === 'return' && req.refund_amount != null && (
              <p className={styles.meta} style={{ marginTop: '0.5rem' }}>
                Refunded: ₹{Number(req.refund_amount).toFixed(2)}
              </p>
            )}

            <p className={styles.meta} style={{ marginTop: '0.4rem', marginBottom: 0 }}>
              Requested {req.created_at && new Date(req.created_at).toLocaleDateString()}
            </p>
          </AccountCard>
        );
      })}
    </div>
  );
}
