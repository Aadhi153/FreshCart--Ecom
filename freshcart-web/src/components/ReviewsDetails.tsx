'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Star, MessageSquare, Pencil, Trash2, Search } from 'lucide-react';
import { getMyReviews, deleteReview, type MyReview, type PendingReview } from '../lib/api';
import { useToast } from './ToastProvider';
import { EmptyState, Skeleton } from './Skeleton';
import { AccountCard } from './AccountCard';
import { AccountButton } from './AccountButton';
import { AccountThumbnail } from './AccountThumbnail';
import { RateItemPrompt } from './RateItemPrompt';

const SORT_OPTIONS = [
  { value: 'recent', label: 'Most recent' },
  { value: 'highest', label: 'Highest rated' },
  { value: 'lowest', label: 'Lowest rated' },
] as const;

// Reviews only get a sort/search toolbar once there's enough of them to actually
// need one — for 1-2 reviews it'd just be visual clutter above a couple of cards.
const SCALABILITY_THRESHOLD = 5;

const iconButtonStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 'var(--radius-sm, 8px)',
  border: 'none',
  background: 'transparent',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

export function ReviewsDetails() {
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [pending, setPending] = useState<PendingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ratedIds, setRatedIds] = useState<Set<string>>(new Set());
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]['value']>('recent');
  const [search, setSearch] = useState('');

  useEffect(() => {
    getMyReviews()
      .then(({ reviews, pending }) => {
        setReviews(reviews);
        setPending(pending);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load reviews.'))
      .finally(() => setLoading(false));
  }, []);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  }, [reviews]);

  const visibleReviews = useMemo(() => {
    let list = reviews;
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((r) => (r.products?.name || '').toLowerCase().includes(q));
    if (sort === 'highest') list = [...list].sort((a, b) => b.rating - a.rating);
    else if (sort === 'lowest') list = [...list].sort((a, b) => a.rating - b.rating);
    // 'recent': reviews already arrive newest-first from the API (ordered by
    // created_at), and editing a review doesn't touch created_at, so no re-sort needed.
    return list;
  }, [reviews, sort, search]);

  const handleEditDone = (review: MyReview) => {
    setReviews((prev) => prev.map((r) => (r.id === review.id ? review : r)));
    setEditingReviewId(null);
    showToast('Review updated.', 'success');
  };

  const handleDelete = async (reviewId: string) => {
    try {
      await deleteReview(reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      setConfirmingDeleteId(null);
      showToast('Review deleted.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete review.', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'grid', gap: '0.9rem' }}>
        {[0, 1].map((i) => (
          <div key={i} style={{ display: 'grid', gap: '0.6rem', padding: '0.95rem', border: 'var(--acc-card-border, 1px solid var(--border-color))', borderRadius: 'var(--acc-card-radius, var(--radius-sm))' }}>
            <Skeleton style={{ width: '35%', height: '1rem' }} />
            <Skeleton style={{ width: '55%', height: '0.85rem' }} />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <p style={{ color: '#B91C1C', fontWeight: 600 }}>{error}</p>;
  }

  const visiblePending = pending.filter((p) => !ratedIds.has(p.product_id));

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      {(reviews.length > 0 || visiblePending.length > 0) && (
        <div style={{ display: 'grid', gap: '0.3rem' }}>
          {reviews.length > 0 && (
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {reviews.length} review{reviews.length === 1 ? '' : 's'} &middot; {averageRating.toFixed(1)} average rating given
            </p>
          )}
          {visiblePending.length > 0 && (
            <Link
              href="/orders#review-nudge"
              style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)', textDecoration: 'none', width: 'fit-content' }}
            >
              {visiblePending.length} delivered item{visiblePending.length === 1 ? '' : 's'} awaiting your review &rarr;
            </Link>
          )}
        </div>
      )}

      {visiblePending.length > 0 && (
        <section>
          <h2 style={{ margin: '0 0 0.75rem', fontSize: 'var(--acc-text-section-title-size, 1.05rem)', fontWeight: 700 }}>
            Rate items you&apos;ve received
          </h2>
          <div style={{ display: 'grid', gap: '0.7rem' }}>
            {visiblePending.map((item) => (
              <RateItemPrompt
                key={item.product_id}
                productId={item.product_id}
                productName={item.product_name}
                onDone={(review) => {
                  setRatedIds((prev) => new Set(prev).add(item.product_id));
                  setReviews((prev) => [review, ...prev]);
                }}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <h2 style={{ margin: 0, fontSize: 'var(--acc-text-section-title-size, 1.05rem)', fontWeight: 700 }}>
            Your Reviews
          </h2>
          {reviews.length > SCALABILITY_THRESHOLD && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by product"
                  style={{
                    padding: '0.4rem 0.6rem 0.4rem 1.7rem',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--layer-0)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem',
                    width: 160,
                  }}
                />
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                style={{ padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--layer-0)', color: 'var(--text-primary)', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {reviews.length === 0 ? (
          <EmptyState
            icon={<MessageSquare size={24} />}
            heading="No reviews yet"
            subtext="Reviews you submit for delivered orders will show up here."
          />
        ) : visibleReviews.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>No reviews match your search.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.7rem' }}>
            {visibleReviews.map((review) => (
              <AccountCard key={review.id} style={{ padding: '0.75rem' }}>
                {editingReviewId === review.id ? (
                  <RateItemPrompt
                    productId={review.product_id}
                    productName={review.products?.name || 'this item'}
                    existingReview={{ id: review.id, rating: review.rating, comment: review.comment }}
                    onDone={handleEditDone}
                    onCancel={() => setEditingReviewId(null)}
                  />
                ) : (
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <AccountThumbnail src={review.products?.image_url} alt={review.products?.name || 'Product'} size={48} />
                    <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{review.products?.name || 'Item'}</p>
                        <div style={{ display: 'flex', gap: '0.1rem' }}>
                          <button type="button" onClick={() => setEditingReviewId(review.id)} aria-label="Edit review" style={iconButtonStyle}>
                            <Pencil size={13} />
                          </button>
                          <button type="button" onClick={() => setConfirmingDeleteId(review.id)} aria-label="Delete review" style={iconButtonStyle}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: '0.1rem' }} aria-label={`${review.rating} out of 5 stars`}>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star key={n} size={12} fill={n <= review.rating ? '#FBBF24' : 'none'} color={n <= review.rating ? '#FBBF24' : 'var(--border-color)'} />
                          ))}
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {review.created_at && new Date(review.created_at).toLocaleDateString()}
                        </span>
                        {review.order_id && (
                          <Link
                            href={`/orders?status=delivered&order=${review.order_id}`}
                            style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}
                          >
                            View order
                          </Link>
                        )}
                      </div>

                      {review.comment && (
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{review.comment}</p>
                      )}

                      {confirmingDeleteId === review.id && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Delete this review?</span>
                          <AccountButton compact variant="secondary" onClick={() => setConfirmingDeleteId(null)}>Cancel</AccountButton>
                          <AccountButton compact variant="danger-solid" onClick={() => handleDelete(review.id)}>Delete</AccountButton>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </AccountCard>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
