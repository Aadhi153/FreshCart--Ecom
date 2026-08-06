'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { submitReview } from '../lib/api';
import { AccountButton } from './AccountButton';
import styles from './RateItemPrompt.module.css';

interface RateItemPromptProps {
  productId: string;
  productName: string;
  onDone: () => void;
}

export function RateItemPrompt({ productId, productName, onDone }: RateItemPromptProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    setError('');
    try {
      await submitReview(productId, rating, comment.trim());
      onDone();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit rating.';
      // The backend returns this exact message for a duplicate (product_id, user_id)
      // review — treat it as "already handled" rather than a failure to retry.
      if (message.includes('already reviewed')) {
        onDone();
        return;
      }
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <p className={styles.label}>Rate {productName}</p>
        <div className={styles.stars} onMouseLeave={() => setHoverRating(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={`${styles.starButton} ${n <= displayRating ? styles.starButtonFilled : ''}`}
              onMouseEnter={() => setHoverRating(n)}
              onClick={() => setRating(n)}
              aria-label={`${n} star${n === 1 ? '' : 's'}`}
            >
              <Star size={15} fill={n <= displayRating ? 'currentColor' : 'none'} />
            </button>
          ))}
        </div>
      </div>

      {rating > 0 && (
        <>
          <textarea
            className={styles.textarea}
            placeholder="Add a comment (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className={styles.footer}>
            <AccountButton compact variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit rating'}
            </AccountButton>
          </div>
        </>
      )}

      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  );
}
