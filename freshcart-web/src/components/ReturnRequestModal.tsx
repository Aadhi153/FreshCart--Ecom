'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { RETURN_REASONS, type ReturnReason, type ReturnRequest } from '@freshcart/types';
import { createReturnRequest } from '../lib/api';
import styles from './ReturnRequestModal.module.css';

interface ReturnRequestModalProps {
  orderId: string;
  orderItemId: string;
  itemName: string;
  onClose: () => void;
  onSuccess: (request: ReturnRequest) => void;
}

export function ReturnRequestModal({ orderId, orderItemId, itemName, onClose, onSuccess }: ReturnRequestModalProps) {
  const [type, setType] = useState<'return' | 'replace'>('return');
  const [reason, setReason] = useState<ReturnReason>(RETURN_REASONS[0]);
  const [refundMethod, setRefundMethod] = useState<'original_payment' | 'store_credit'>('original_payment');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const request = await createReturnRequest({
        order_id: orderId,
        order_item_id: orderItemId,
        type,
        reason,
        ...(type === 'return' ? { refund_method: refundMethod } : {}),
      });
      onSuccess(request);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Return or Replace</h2>
          <button type="button" onClick={onClose} className={styles.closeButton} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <p className={styles.itemLine}>{itemName}</p>

        <div className={styles.tabRow}>
          <button
            type="button"
            className={`${styles.tab} ${type === 'return' ? styles.tabActive : ''}`}
            onClick={() => setType('return')}
          >
            Return for refund
          </button>
          <button
            type="button"
            className={`${styles.tab} ${type === 'replace' ? styles.tabActive : ''}`}
            onClick={() => setType('replace')}
          >
            Replace item
          </button>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="return-reason">Reason</label>
          <select
            id="return-reason"
            className={styles.select}
            value={reason}
            onChange={(e) => setReason(e.target.value as ReturnReason)}
          >
            {RETURN_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {type === 'return' ? (
          <div className={styles.field}>
            <span className={styles.label}>Refund method</span>
            <div className={styles.radioRow}>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="refund-method"
                  checked={refundMethod === 'original_payment'}
                  onChange={() => setRefundMethod('original_payment')}
                />
                Original payment method
              </label>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="refund-method"
                  checked={refundMethod === 'store_credit'}
                  onChange={() => setRefundMethod('store_credit')}
                />
                Store credit
              </label>
            </div>
          </div>
        ) : (
          <p className={styles.itemLine}>
            A replacement will be sent once the original item is picked up and confirmed.
          </p>
        )}

        {error && <p className={styles.errorText}>{error}</p>}

        <div className={styles.actions}>
          <button type="button" onClick={onClose} className={styles.cancelButton} disabled={submitting}>
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} className={styles.submitButton} disabled={submitting}>
            {submitting ? 'Submitting…' : `Confirm ${type === 'return' ? 'return' : 'replacement'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
