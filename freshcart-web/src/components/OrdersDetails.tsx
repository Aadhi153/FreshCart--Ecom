'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  ChevronDown,
  Package,
  Search,
  ShoppingCart,
  XCircle,
} from 'lucide-react';
import { cancelOrder, getMyOrders } from '../lib/api';
import { useCartStore } from '../lib/store';
import type { Order } from '@freshcart/types';
import { EmptyState, Skeleton } from './Skeleton';
import { OrderTimeline } from './OrderTimeline';
import { useToast } from './ToastProvider';
import styles from './OrdersDetails.module.css';

const STEPS = ['placed', 'packed', 'shipped', 'delivered'] as const;
const FILTERS = ['all', ...STEPS, 'cancelled'] as const;
const CANCELLABLE_STATUSES = new Set(['placed', 'packed']);
const PAGE_SIZE = 10;

function statusBadgeClass(status: string) {
  if (status === 'cancelled') return styles.statusBadgeCancelled;
  if (status === 'delivered') return styles.statusBadgeDelivered;
  return styles.statusBadgeActive;
}

export function OrdersDetails() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const addItem = useCartStore((state) => state.addItem);
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    setLoading(true);
    getMyOrders(page, PAGE_SIZE, filter)
      .then(({ orders, total }) => {
        setOrders(orders);
        setTotalCount(total);
        // If a status change or cancellation shrank the list out from under the
        // current page, step back instead of showing a stranded empty page.
        if (orders.length === 0 && page > 1) setPage((p) => p - 1);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load orders.'))
      .finally(() => {
        setLoading(false);
        setInitialLoading(false);
      });
  }, [page, filter]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Free-text search only narrows the current page's results — the status filter
  // (which does scale to the full order history) is applied server-side above.
  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((order) => {
      const idMatch = (order.id || '').toLowerCase().includes(q);
      const itemMatch = (order.order_items || []).some((item: any) =>
        String(item.products?.name || '').toLowerCase().includes(q)
      );
      return idMatch || itemMatch;
    });
  }, [orders, query]);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const buyAgain = (order: Order) => {
    (order.order_items || []).forEach((item: any) => {
      addItem({
        id: item.product_id,
        productId: item.product_id,
        name: item.products?.name || 'Product',
        price: item.price_at_time,
        image: item.products?.image_url,
        quantity: item.quantity,
      });
    });
    router.push('/cart');
  };

  const handleCancelOrder = async (orderId: string) => {
    setProcessingId(orderId);
    try {
      const updated = await cancelOrder(orderId);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: updated.status } : o)));
      showToast('Order cancelled.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to cancel order.', 'error');
    } finally {
      setProcessingId(null);
      setCancellingId(null);
    }
  };

  if (initialLoading) {
    return (
      <div className={styles.list}>
        {[0, 1, 2].map((i) => (
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

  if (totalCount === 0 && filter === 'all') {
    return (
      <EmptyState
        icon={<Package size={24} />}
        heading="No orders yet"
        subtext="Orders will appear here after checkout."
        ctaHref="/shop"
        ctaLabel="Shop products"
      />
    );
  }

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.searchBox}>
          <Search size={15} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by order ID or item"
            className={styles.searchInput}
          />
        </div>
      </div>

      <div className={styles.filterRow}>
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => { setFilter(f); setPage(1); }}
            className={`${styles.filterChip} ${filter === f ? styles.filterChipActive : ''}`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.list}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.skeletonCard}>
              <Skeleton style={{ width: '35%', height: '1rem' }} />
              <Skeleton style={{ width: '55%', height: '0.85rem' }} />
              <Skeleton style={{ width: '100%', height: '2.2rem' }} />
            </div>
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>No orders match your search or filter.</p>
      ) : (
        <div className={styles.list}>
          {filteredOrders.map((order) => {
            const cancelled = order.status === 'cancelled';
            const items = order.order_items || [];
            const isOpen = expanded.has(order.id || '');
            const deliveryAddress = (order as any).deliveryAddress || (order as any).delivery_address;

            return (
              <article key={order.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <strong className={styles.orderId}>#{order.id?.slice(0, 8).toUpperCase()}</strong>
                  <span className={`${styles.statusBadge} ${statusBadgeClass(order.status || '')}`}>
                    {cancelled ? <XCircle size={13} /> : <CheckCircle2 size={13} />}
                    {order.status}
                  </span>
                </div>

                <p className={styles.meta}>
                  {order.created_at && new Date(order.created_at).toLocaleString()}
                </p>

                {!cancelled && <OrderTimeline status={order.status || ''} />}

                <button
                  type="button"
                  onClick={() => toggleExpanded(order.id || '')}
                  className={styles.ghostButton}
                  style={{ marginBottom: '0.5rem' }}
                >
                  <ChevronDown size={14} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform var(--transition-base)' }} />
                  {isOpen ? 'Hide details' : `${items.length} item${items.length === 1 ? '' : 's'}`}
                </button>

                {!isOpen && items.length > 0 && (
                  <div className={styles.thumbRow}>
                    {items.slice(0, 4).map((item: any, i: number) => (
                      <div key={item.id || i} className={styles.thumb}>
                        {item.products?.image_url && (
                          <Image src={item.products.image_url} alt={item.products?.name || 'Item'} fill sizes="44px" style={{ objectFit: 'cover' }} />
                        )}
                      </div>
                    ))}
                    {items.length > 4 && (
                      <div className={`${styles.thumb} ${styles.thumbMore}`}>+{items.length - 4}</div>
                    )}
                  </div>
                )}

                {isOpen && (
                  <>
                    <div className={styles.itemsList}>
                      {items.map((item: any, i: number) => (
                        <div key={item.id || i} className={styles.itemRow}>
                          <div className={styles.itemImage}>
                            {item.products?.image_url && (
                              <Image src={item.products.image_url} alt={item.products?.name || 'Item'} fill sizes="42px" style={{ objectFit: 'cover' }} />
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p className={styles.itemName}>{item.products?.name || 'Item'}</p>
                            <p className={styles.itemQty}>Qty {item.quantity} &middot; Rs.{Number(item.price_at_time).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {deliveryAddress && (
                      <div className={styles.addressBox}>
                        Delivered to: {[deliveryAddress.fullName, deliveryAddress.line1, deliveryAddress.city, deliveryAddress.pincode]
                          .filter(Boolean)
                          .join(', ')}
                      </div>
                    )}
                    {order.delivery_slot && (
                      <div className={styles.addressBox}>
                        Delivery slot: {order.delivery_slot}
                      </div>
                    )}
                  </>
                )}

                {cancellingId === order.id && (
                  <div className={styles.confirmRow} style={{ marginBottom: '0.6rem' }}>
                    <span className={styles.confirmText}>Cancel this order?</span>
                    <button
                      type="button"
                      disabled={processingId === order.id}
                      onClick={() => handleCancelOrder(order.id || '')}
                      className={styles.dangerButton}
                    >
                      {processingId === order.id ? 'Cancelling...' : 'Yes, cancel'}
                    </button>
                    <button type="button" onClick={() => setCancellingId(null)} className={styles.ghostButton}>
                      Keep order
                    </button>
                  </div>
                )}

                <div className={styles.footer}>
                  <p className={styles.total}>Total: Rs.{Number(order.total_amount).toFixed(2)}</p>
                  <div className={styles.actions}>
                    {CANCELLABLE_STATUSES.has(order.status || '') && cancellingId !== order.id && (
                      <button type="button" onClick={() => setCancellingId(order.id || '')} className={styles.dangerButton}>
                        Cancel order
                      </button>
                    )}
                    <button onClick={() => buyAgain(order)} className={styles.primaryButton}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <ShoppingCart size={14} />
                        Buy again
                      </span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className={styles.pageButton}
          >
            Previous
          </button>
          <span className={styles.pageStatus}>Page {page} of {totalPages}</span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className={styles.pageButton}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
