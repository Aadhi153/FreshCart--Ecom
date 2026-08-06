'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronDown,
  Download,
  Package,
  RotateCcw,
  Search,
  ShoppingCart,
  Star,
  Truck,
} from 'lucide-react';
import {
  cancelOrder,
  getMyOrders,
  getMyReturnRequests,
  getMyReviews,
  getOrderSummary,
  getRepeatItems,
  type OrderSummary,
  type PendingReview,
  type RepeatItem,
} from '../lib/api';
import { useCartStore } from '../lib/store';
import type { Order, ReturnRequest } from '@freshcart/types';
import { isWithinReturnWindow } from '../lib/returnEligibility';
import { formatPrice } from '../lib/formatPrice';
import { EmptyState, Skeleton } from './Skeleton';
import { OrderTimeline } from './OrderTimeline';
import { ReturnRequestModal } from './ReturnRequestModal';
import { RateItemPrompt } from './RateItemPrompt';
import { useToast } from './ToastProvider';
import { AccountCard } from './AccountCard';
import { AccountButton } from './AccountButton';
import { AccountThumbnail } from './AccountThumbnail';
import { StatusBadge } from './StatusBadge';
import { downloadInvoice } from '../lib/invoice';
import styles from './OrdersDetails.module.css';

const STEPS = ['placed', 'packed', 'shipped', 'delivered'] as const;
const FILTERS = ['all', ...STEPS, 'cancelled'] as const;
const CANCELLABLE_STATUSES = new Set(['placed', 'packed']);
const LIVE_STATUSES = new Set(['placed', 'packed', 'shipped']);
const PAGE_SIZE = 10;
const POLL_INTERVAL_MS = 20000;

// Mirrors StatusBadge.module.css's palette so the left-border accent and the
// status pill always agree on what each status means.
const STATUS_BORDER_COLORS: Record<string, string> = {
  placed: '#3B82F6',
  packed: '#F59E0B',
  shipped: '#8B5CF6',
  delivered: '#22C55E',
  cancelled: '#EF4444',
};

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
  const [requestedItemIds, setRequestedItemIds] = useState<Set<string>>(new Set());
  const [returnTarget, setReturnTarget] = useState<{ orderId: string; orderItemId: string; itemName: string } | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [orderSummary, setOrderSummary] = useState<OrderSummary>({ orderCount: 0, totalSpent: 0, inTransitCount: 0 });
  const [repeatItems, setRepeatItems] = useState<RepeatItem[]>([]);
  const [reviewedProductIds, setReviewedProductIds] = useState<Set<string>>(new Set());
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [deliveredRatedCount, setDeliveredRatedCount] = useState(0);
  const [deliveredTotalCount, setDeliveredTotalCount] = useState(0);
  const [reviewNudgeOpen, setReviewNudgeOpen] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const router = useRouter();
  const searchParams = useSearchParams();
  const didJumpToOrderRef = useRef(false);
  const { showToast } = useToast();

  // Fetched once (not paginated with the orders list) — a customer's total return/replace
  // history is small, and this only needs to answer "does this item already have an
  // active request" to hide the Return/Replace buttons for it.
  useEffect(() => {
    getMyReturnRequests()
      .then((requests: ReturnRequest[]) => {
        const ids = new Set(requests.filter((r) => r.status !== 'rejected').map((r) => r.order_item_id));
        setRequestedItemIds(ids);
      })
      .catch(() => {});
  }, []);

  // Personalized stats header (order count / lifetime spend / in-transit count).
  useEffect(() => {
    getOrderSummary().then(setOrderSummary).catch(() => {});
  }, []);

  // "Reorder your usual" — products bought across 2+ separate orders.
  useEffect(() => {
    getRepeatItems().then(setRepeatItems).catch(() => {});
  }, []);

  // Review-progress nudge, and the source of truth for "already reviewed" so a
  // delivered item's Rate prompt doesn't keep reappearing after a page reload.
  useEffect(() => {
    getMyReviews()
      .then(({ reviews, pending, deliveredRatedCount, deliveredTotalCount }) => {
        setReviewedProductIds(new Set(reviews.map((r) => r.product_id)));
        setPendingReviews(pending);
        setDeliveredRatedCount(deliveredRatedCount);
        setDeliveredTotalCount(deliveredTotalCount);
      })
      .catch(() => {});
  }, []);

  // A product is reviewed once, regardless of which order card (or the review
  // nudge) it was rated from — clear it everywhere at once.
  const handleReviewDone = (productId: string) => {
    setReviewedProductIds((prev) => new Set(prev).add(productId));
    setPendingReviews((prev) => prev.filter((p) => p.product_id !== productId));
    setDeliveredRatedCount((prev) => prev + 1);
  };

  // Deep link support from the Returns page's personalized empty state
  // ("?status=delivered&order=<id>") — preselect the filter once on mount.
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam && (FILTERS as readonly string[]).includes(statusParam)) {
      setFilter(statusParam as (typeof FILTERS)[number]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once the deep-linked order is loaded, expand and scroll to it — only once,
  // so the 20s poll refresh below doesn't keep yanking scroll position back.
  useEffect(() => {
    const orderParam = searchParams.get('order');
    if (!orderParam || loading || didJumpToOrderRef.current) return;
    if (!orders.some((o) => o.id === orderParam)) return;
    didJumpToOrderRef.current = true;
    setExpanded((prev) => new Set(prev).add(orderParam));
    requestAnimationFrame(() => {
      document.getElementById(`order-${orderParam}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [orders, loading, searchParams]);

  const handleReorderItem = (item: RepeatItem) => {
    addItem({
      id: item.product_id,
      productId: item.product_id,
      name: item.name,
      price: item.price,
      image: item.image_url || undefined,
      quantity: 1,
    });
    showToast(`Added ${item.name} to cart`, 'success');
  };

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

  // Quietly re-fetch the current page while any visible order is still in flight,
  // so a status change made elsewhere (e.g. by an admin) shows up without the
  // customer having to reload. No loading spinner — this must not disrupt scroll
  // position or an in-progress cancel/search interaction.
  useEffect(() => {
    if (!orders.some((o) => LIVE_STATUSES.has(o.status || ''))) return;
    const interval = setInterval(() => {
      getMyOrders(page, PAGE_SIZE, filter)
        .then(({ orders: refreshed, total }) => {
          setOrders(refreshed);
          setTotalCount(total);
        })
        .catch(() => {});
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [orders, page, filter]);

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

  const handleDownloadInvoice = async (order: Order) => {
    setDownloadingId(order.id || '');
    try {
      await downloadInvoice(order);
      showToast('Invoice downloaded.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to generate invoice.', 'error');
    } finally {
      setDownloadingId(null);
    }
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
          {orderSummary.orderCount} order{orderSummary.orderCount === 1 ? '' : 's'} · {formatPrice(orderSummary.totalSpent)} lifetime · {orderSummary.inTransitCount} in transit
        </p>
        {repeatItems.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Reorder your usual:</span>
            {repeatItems.slice(0, 3).map((item) => (
              <button
                key={item.product_id}
                type="button"
                onClick={() => handleReorderItem(item)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                  padding: '0.3rem 0.7rem', borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--border-color)', background: 'var(--layer-0)',
                  color: 'var(--text-primary)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                }}
              >
                <RotateCcw size={11} /> {item.name}
              </button>
            ))}
          </div>
        )}
      </div>

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

      {deliveredTotalCount > 0 && deliveredRatedCount < deliveredTotalCount && (
        <AccountCard hoverable style={{ marginBottom: '1rem', display: 'grid', gap: reviewNudgeOpen ? '0.75rem' : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Star size={15} color="#F59E0B" fill="#F59E0B" />
              You&apos;ve rated {deliveredRatedCount} of {deliveredTotalCount} delivered items
            </p>
            <AccountButton compact variant="secondary" onClick={() => setReviewNudgeOpen((v) => !v)}>
              {reviewNudgeOpen ? 'Hide' : 'Leave a review'}
            </AccountButton>
          </div>
          {reviewNudgeOpen && (
            <div style={{ display: 'grid', gap: '0.6rem' }}>
              {pendingReviews.map((item) => (
                <RateItemPrompt
                  key={item.product_id}
                  productId={item.product_id}
                  productName={item.product_name}
                  onDone={() => handleReviewDone(item.product_id)}
                />
              ))}
            </div>
          )}
        </AccountCard>
      )}

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
              <AccountCard
                key={order.id}
                id={`order-${order.id}`}
                hoverable
                style={{ borderLeft: `4px solid ${STATUS_BORDER_COLORS[order.status || ''] || 'var(--border-color)'}` }}
              >
                <div className={styles.cardTop}>
                  <strong className={styles.orderId}>#{order.id?.slice(0, 8).toUpperCase()}</strong>
                  <StatusBadge kind="order" status={order.status || ''} />
                </div>

                <p className={styles.meta}>
                  {order.created_at && new Date(order.created_at).toLocaleString()}
                </p>

                {!cancelled && order.status !== 'delivered' && order.delivery_slot && (
                  <p className={styles.meta} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    <Truck size={13} style={{ verticalAlign: '-2px', marginRight: '0.3rem' }} />
                    Arriving: {order.delivery_slot}
                  </p>
                )}

                {order.status === 'shipped' && (
                  <p className={styles.meta} style={{ color: 'var(--accent)', fontWeight: 700 }}>
                    Out for delivery — your order is on its way.
                  </p>
                )}

                {!cancelled && (
                  <OrderTimeline
                    status={order.status || ''}
                    timestamps={{ placed: order.created_at, delivered: order.delivered_at }}
                  />
                )}

                <AccountButton
                  compact
                  variant="secondary"
                  onClick={() => toggleExpanded(order.id || '')}
                  style={{ marginBottom: '0.5rem' }}
                  leftIcon={<ChevronDown size={14} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform var(--acc-transition-base, 250ms ease-out)' }} />}
                >
                  {isOpen ? 'Hide details' : `${items.length} item${items.length === 1 ? '' : 's'}`}
                </AccountButton>

                {!isOpen && items.length > 0 && (
                  <div className={styles.thumbRow}>
                    {items.slice(0, 4).map((item: any, i: number) => (
                      <AccountThumbnail key={item.id || i} src={item.products?.image_url} alt={item.products?.name || 'Item'} />
                    ))}
                    {items.length > 4 && (
                      <div className={`${styles.thumb} ${styles.thumbMore}`}>+{items.length - 4}</div>
                    )}
                  </div>
                )}

                {isOpen && (
                  <>
                    <div className={styles.itemsList}>
                      {items.map((item: any, i: number) => {
                        const eligible = !item.is_gift && isWithinReturnWindow(order) && !requestedItemIds.has(item.id);
                        const alreadyRequested = !item.is_gift && isWithinReturnWindow(order) && requestedItemIds.has(item.id);
                        return (
                          <div key={item.id || i} className={styles.itemRow} style={{ flexWrap: 'wrap' }}>
                            <AccountThumbnail src={item.products?.image_url} alt={item.products?.name || 'Item'} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p className={styles.itemName}>
                                {item.products?.name || 'Item'}
                                {item.is_gift && <span style={{ marginLeft: '0.4rem', color: 'var(--primary, #16a34a)', fontSize: '0.75rem', fontWeight: 600 }}>🎁 FREE GIFT</span>}
                              </p>
                              <p className={styles.itemQty}>Qty {item.quantity} &middot; {item.is_gift ? 'Free' : `Rs.${Number(item.price_at_time).toFixed(2)}`}</p>
                            </div>
                            {eligible && (
                              <AccountButton
                                compact
                                variant="secondary"
                                onClick={() =>
                                  setReturnTarget({ orderId: order.id || '', orderItemId: item.id, itemName: item.products?.name || 'Item' })
                                }
                              >
                                Return / Replace
                              </AccountButton>
                            )}
                            {alreadyRequested && (
                              <StatusBadge kind="return" status="requested" />
                            )}
                          </div>
                        );
                      })}
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
                    {(order.discount_amount ? order.discount_amount > 0 : false) && (
                      <div className={styles.breakdownRow}>
                        <span>Discount</span>
                        <span>-Rs.{Number(order.discount_amount).toFixed(2)}</span>
                      </div>
                    )}
                    <div className={styles.breakdownRow}>
                      <span>Delivery Fee</span>
                      <span>{order.delivery_fee ? `Rs.${Number(order.delivery_fee).toFixed(2)}` : 'Free'}</span>
                    </div>
                  </>
                )}

                {cancellingId === order.id && (
                  <div className={styles.confirmRow} style={{ marginBottom: '0.6rem' }}>
                    <span className={styles.confirmText}>Cancel this order?</span>
                    <AccountButton
                      compact
                      variant="danger-solid"
                      disabled={processingId === order.id}
                      onClick={() => handleCancelOrder(order.id || '')}
                    >
                      {processingId === order.id ? 'Cancelling...' : 'Yes, cancel'}
                    </AccountButton>
                    <AccountButton compact variant="secondary" onClick={() => setCancellingId(null)}>
                      Keep order
                    </AccountButton>
                  </div>
                )}

                <div className={styles.footer}>
                  <p className={styles.total}>Total: Rs.{Number(order.total_amount).toFixed(2)}</p>
                  <div className={styles.actions}>
                    {CANCELLABLE_STATUSES.has(order.status || '') && cancellingId !== order.id && (
                      <AccountButton compact variant="danger" onClick={() => setCancellingId(order.id || '')}>
                        Cancel order
                      </AccountButton>
                    )}
                    <AccountButton
                      compact
                      variant="secondary"
                      onClick={() => handleDownloadInvoice(order)}
                      disabled={downloadingId === order.id}
                      leftIcon={<Download size={14} />}
                    >
                      {downloadingId === order.id ? 'Preparing…' : 'Invoice'}
                    </AccountButton>
                    <AccountButton compact variant="primary" onClick={() => buyAgain(order)} leftIcon={<ShoppingCart size={14} />}>
                      Buy again
                    </AccountButton>
                  </div>
                </div>

                {order.status === 'delivered' && items.some((item: any) => !item.is_gift && item.product_id && !reviewedProductIds.has(item.product_id)) && (
                  <div style={{ marginTop: '0.7rem' }}>
                    {items
                      .filter((item: any) => !item.is_gift && item.product_id && !reviewedProductIds.has(item.product_id))
                      .map((item: any, i: number) => (
                        <RateItemPrompt
                          key={item.id || i}
                          productId={item.product_id}
                          productName={item.products?.name || 'this item'}
                          onDone={() => handleReviewDone(item.product_id)}
                        />
                      ))}
                  </div>
                )}
              </AccountCard>
            );
          })}
        </div>
      )}

      {returnTarget && (
        <ReturnRequestModal
          orderId={returnTarget.orderId}
          orderItemId={returnTarget.orderItemId}
          itemName={returnTarget.itemName}
          onClose={() => setReturnTarget(null)}
          onSuccess={(request) => {
            setRequestedItemIds((prev) => new Set(prev).add(request.order_item_id));
            setReturnTarget(null);
            showToast(request.type === 'replace' ? 'Replacement requested.' : 'Return requested.', 'success');
          }}
        />
      )}

      {!loading && totalPages > 1 && (
        <div className={styles.pagination}>
          <AccountButton
            compact
            variant="secondary"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </AccountButton>
          <span className={styles.pageStatus}>Page {page} of {totalPages}</span>
          <AccountButton
            compact
            variant="secondary"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </AccountButton>
        </div>
      )}
    </div>
  );
}
