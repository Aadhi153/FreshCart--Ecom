import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { createCoupon, updateCoupon } from '../lib/api';
import type { Coupon } from '@freshcart/types';
import { useToast } from './ToastProvider';

interface CouponFormModalProps {
  isOpen: boolean;
  editingCoupon: Coupon | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

const emptyForm = {
  code: '',
  discount_type: 'flat' as 'flat' | 'percent',
  discount_value: 0,
  min_order_amount: 0,
  max_discount_amount: '',
  active: true,
  expires_at: '',
};

export default function CouponFormModal({ isOpen, editingCoupon, onClose, onSaved }: CouponFormModalProps) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    if (!isOpen) return;
    if (editingCoupon) {
      setFormData({
        code: editingCoupon.code,
        discount_type: editingCoupon.discount_type,
        discount_value: editingCoupon.discount_value,
        min_order_amount: editingCoupon.min_order_amount,
        max_discount_amount: editingCoupon.max_discount_amount != null ? String(editingCoupon.max_discount_amount) : '',
        active: editingCoupon.active,
        expires_at: editingCoupon.expires_at ? editingCoupon.expires_at.slice(0, 10) : '',
      });
    } else {
      setFormData(emptyForm);
    }
  }, [isOpen, editingCoupon]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Partial<Coupon> = {
        code: formData.code.trim(),
        discount_type: formData.discount_type,
        discount_value: Number(formData.discount_value),
        min_order_amount: Number(formData.min_order_amount) || 0,
        max_discount_amount: formData.max_discount_amount ? Number(formData.max_discount_amount) : null,
        active: formData.active,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
      };

      if (editingCoupon) {
        await updateCoupon(editingCoupon.id!, payload);
      } else {
        await createCoupon(payload);
      }
      await onSaved();
      showToast(editingCoupon ? 'Coupon updated' : 'Coupon created', 'success');
    } catch (error) {
      console.error('Error saving coupon:', error);
      const message = error instanceof Error ? error.message : 'Failed to save coupon.';
      showToast(message.includes('duplicate') ? 'That coupon code already exists.' : message, 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingCoupon ? 'Edit Coupon' : 'Add New Coupon'}>
      <form onSubmit={handleSave}>
        <div className="form-group">
          <label>Coupon Code *</label>
          <input
            required
            type="text"
            className="form-input"
            style={{ textTransform: 'uppercase' }}
            value={formData.code}
            onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            placeholder="e.g. WELCOME10"
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Discount Type *</label>
            <select
              className="form-input"
              value={formData.discount_type}
              onChange={e => setFormData({ ...formData, discount_type: e.target.value as 'flat' | 'percent' })}
            >
              <option value="flat">Flat amount (₹)</option>
              <option value="percent">Percentage (%)</option>
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Discount Value *</label>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              className="form-input"
              value={formData.discount_value}
              onChange={e => setFormData({ ...formData, discount_value: Number(e.target.value) })}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Minimum Order Amount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-input"
              value={formData.min_order_amount}
              onChange={e => setFormData({ ...formData, min_order_amount: Number(e.target.value) })}
            />
          </div>
          {formData.discount_type === 'percent' && (
            <div className="form-group" style={{ flex: 1 }}>
              <label>Max Discount Cap</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-input"
                value={formData.max_discount_amount}
                onChange={e => setFormData({ ...formData, max_discount_amount: e.target.value })}
                placeholder="No cap"
              />
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Expires On</label>
          <input
            type="date"
            className="form-input"
            value={formData.expires_at}
            onChange={e => setFormData({ ...formData, expires_at: e.target.value })}
          />
        </div>

        <div className="form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
          <input type="checkbox" id="couponActive" checked={formData.active} onChange={e => setFormData({ ...formData, active: e.target.checked })} />
          <label htmlFor="couponActive" style={{ margin: 0, cursor: 'pointer' }}>Active</label>
        </div>

        <div className="modal-footer" style={{ marginTop: '2rem' }}>
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary">Save Coupon</button>
        </div>
      </form>
    </Modal>
  );
}
