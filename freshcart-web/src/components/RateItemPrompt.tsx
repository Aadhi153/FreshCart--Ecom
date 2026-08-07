'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { submitReview, updateReview, type MyReview } from '../lib/api';
import { AccountButton } from './AccountButton';
import styles from './RateItemPrompt.module.css';

interface RateItemPromptProps {
  productId: string;
  productName: string;
  // Present when editing an already-submitted review — pre-fills the form and
  // switches the submit action from create (POST) to edit (PATCH).
  existingReview?: { id: string; rating: number; comment: string | null } | null;
  onDone: (review: MyReview) => void;
  onCancel?: () => void;
}

export function RateItemPrompt({ productId, productName, existingReview, onDone, onCancel }: RateItemPromptProps) {
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState(existingReview?.comment ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    setError('');
    try {
      const review = existingReview
        ? await updateReview(existingReview.id, rating, comment.trim())
        : await submitReview(productId, rating, comment.trim());
      onDone(review);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit rating.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoverRating || rating;
  // For a fresh rating, the comment box only appears once a star is picked;
  // editing an existing review already has a rating, so show it immediately.
  const showForm = rating > 0;

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <p className={styles.label}>{existingReview ? `Your rating for ${productName}` : `Rate ${productName}`}</p>
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

      {showForm && (
        <>
          <textarea
            className={styles.textarea}
            placeholder="Add a comment (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className={styles.footer}>
            {onCancel && (
              <AccountButton compact variant="secondary" onClick={onCancel} disabled={submitting}>
                Cancel
              </AccountButton>
            )}
            <AccountButton compact variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving…' : existingReview ? 'Save changes' : 'Submit rating'}
            </AccountButton>
          </div>
        </>
      )}

      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  );
}
