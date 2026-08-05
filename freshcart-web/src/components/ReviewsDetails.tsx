'use client';

import { useEffect, useState } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import { getMyReviews, type MyReview, type PendingReview } from '../lib/api';
import { EmptyState, Skeleton } from './Skeleton';
import { AccountCard } from './AccountCard';
import { AccountThumbnail } from './AccountThumbnail';
import { RateItemPrompt } from './RateItemPrompt';

export function ReviewsDetails() {
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [pending, setPending] = useState<PendingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ratedIds, setRatedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    getMyReviews()
      .then(({ reviews, pending }) => {
        setReviews(reviews);
        setPending(pending);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load reviews.'))
      .finally(() => setLoading(false));
  }, []);

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
                onDone={() => setRatedIds((prev) => new Set(prev).add(item.product_id))}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 style={{ margin: '0 0 0.75rem', fontSize: 'var(--acc-text-section-title-size, 1.05rem)', fontWeight: 700 }}>
          Your Reviews
        </h2>
        {reviews.length === 0 ? (
          <EmptyState
            icon={<MessageSquare size={24} />}
            heading="No reviews yet"
            subtext="Reviews you submit for delivered orders will show up here."
          />
        ) : (
          <div style={{ display: 'grid', gap: '0.9rem' }}>
            {reviews.map((review) => (
              <AccountCard key={review.id} style={{ display: 'flex', gap: '0.9rem', alignItems: 'flex-start' }}>
                <AccountThumbnail src={review.products?.image_url} alt={review.products?.name || 'Product'} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>{review.products?.name || 'Item'}</p>
                    <div style={{ display: 'flex', gap: '0.1rem' }} aria-label={`${review.rating} out of 5 stars`}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} size={14} fill={n <= review.rating ? '#FBBF24' : 'none'} color={n <= review.rating ? '#FBBF24' : 'var(--border-color)'} />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p style={{ margin: '0.4rem 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{review.comment}</p>
                  )}
                  <p style={{ margin: '0.4rem 0 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    {review.created_at && new Date(review.created_at).toLocaleDateString()}
                  </p>
                </div>
              </AccountCard>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
