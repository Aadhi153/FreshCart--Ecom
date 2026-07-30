import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import Modal from './Modal';
import { createPromotion, updatePromotion, getCategories, getProducts } from '../lib/api';
import type { Promotion, Category, Product } from '@freshcart/types';
import { useToast } from './ToastProvider';

interface PromotionFormModalProps {
  isOpen: boolean;
  editingPromotion: Promotion | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

const emptyForm = {
  name: '',
  requires_code: true,
  code: '',
  discount_type: 'percentage' as 'percentage' | 'flat' | 'bogo',
  discount_value: 0,
  min_order_value: '',
  max_discount_amount: '',
  applicable_scope: 'cart' as 'cart' | 'category' | 'product',
  applicable_ids: [] as string[],
  usage_limit_total: '',
  usage_limit_per_user: '',
  valid_from: new Date().toISOString().slice(0, 10),
  valid_until: '',
  is_active: true,
};

export default function PromotionFormModal({ isOpen, editingPromotion, onClose, onSaved }: PromotionFormModalProps) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState(emptyForm);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    getCategories().then(setCategories).catch(() => {});
    getProducts().then(setProducts).catch(() => {});

    if (editingPromotion) {
      setFormData({
        name: editingPromotion.name,
        requires_code: editingPromotion.requires_code,
        code: editingPromotion.code ?? '',
        discount_type: editingPromotion.discount_type,
        discount_value: editingPromotion.discount_value,
        min_order_value: editingPromotion.min_order_value != null ? String(editingPromotion.min_order_value) : '',
        max_discount_amount: editingPromotion.max_discount_amount != null ? String(editingPromotion.max_discount_amount) : '',
        applicable_scope: editingPromotion.applicable_scope,
        applicable_ids: editingPromotion.applicable_ids ?? [],
        usage_limit_total: editingPromotion.usage_limit_total != null ? String(editingPromotion.usage_limit_total) : '',
        usage_limit_per_user: editingPromotion.usage_limit_per_user != null ? String(editingPromotion.usage_limit_per_user) : '',
        valid_from: editingPromotion.valid_from ? editingPromotion.valid_from.slice(0, 10) : new Date().toISOString().slice(0, 10),
        valid_until: editingPromotion.valid_until ? editingPromotion.valid_until.slice(0, 10) : '',
        is_active: editingPromotion.is_active,
      });
    } else {
      setFormData(emptyForm);
    }
  }, [isOpen, editingPromotion]);

  const toggleId = (id: string) => {
    setFormData(prev => ({
      ...prev,
      applicable_ids: prev.applicable_ids.includes(id)
        ? prev.applicable_ids.filter(x => x !== id)
        : [...prev.applicable_ids, id],
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Coupons are always cart-wide; scope/applicable_ids only apply to auto-offers.
      const scope = formData.requires_code ? 'cart' : formData.applicable_scope;
      const payload: Partial<Promotion> = {
        name: formData.name.trim(),
        requires_code: formData.requires_code,
        code: formData.requires_code ? formData.code.trim() : null,
        discount_type: formData.discount_type,
        discount_value: Number(formData.discount_value),
        min_order_value: formData.min_order_value ? Number(formData.min_order_value) : null,
        max_discount_amount: formData.max_discount_amount ? Number(formData.max_discount_amount) : null,
        applicable_scope: scope,
        applicable_ids: scope === 'cart' ? null : formData.applicable_ids,
        usage_limit_total: formData.usage_limit_total ? Number(formData.usage_limit_total) : null,
        usage_limit_per_user: formData.usage_limit_per_user ? Number(formData.usage_limit_per_user) : null,
        valid_from: formData.valid_from ? new Date(formData.valid_from).toISOString() : undefined,
        valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
        is_active: formData.is_active,
      };

      if (editingPromotion) {
        await updatePromotion(editingPromotion.id!, payload);
      } else {
        await createPromotion(payload);
      }
      await onSaved();
      showToast(editingPromotion ? 'Promotion updated' : 'Promotion created', 'success');
    } catch (error) {
      console.error('Error saving promotion:', error);
      const message = error instanceof Error ? error.message : 'Failed to save promotion.';
      showToast(message, 'error');
    }
  };

  const isValid =
    formData.name.trim().length > 0 &&
    (!formData.requires_code || formData.code.trim().length > 0) &&
    !!formData.discount_type &&
    Number(formData.discount_value) > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingPromotion ? 'Edit Promotion' : 'Add New Promotion'}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" form="promotion-form" className="btn-primary" disabled={!isValid}>
            {editingPromotion ? 'Save Promotion' : 'Create Promotion'}
          </button>
        </>
      }
    >
      <form id="promotion-form" onSubmit={handleSave}>
        {/* Basic Info */}
        <div className="form-section">
          <p className="form-section-label">Basic Info</p>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem' }}>
            <button
              type="button"
              className={formData.requires_code ? 'btn-primary' : 'btn-secondary'}
              style={{ flex: 1 }}
              onClick={() => setFormData({ ...formData, requires_code: true })}
            >
              Coupon
            </button>
            <button
              type="button"
              className={!formData.requires_code ? 'btn-primary' : 'btn-secondary'}
              style={{ flex: 1 }}
              onClick={() => setFormData({ ...formData, requires_code: false, code: '' })}
            >
              Auto-Offer
            </button>
          </div>

          <div className="form-group">
            <label>Name *</label>
            <input
              required
              type="text"
              className="form-input"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Dairy Week Sale"
            />
          </div>

          {formData.requires_code && (
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
          )}
        </div>

        {/* Discount Rules */}
        <div className="form-section">
          <p className="form-section-label">Discount Rules</p>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Discount Type *</label>
              <select
                className="form-input"
                value={formData.discount_type}
                onChange={e => setFormData({ ...formData, discount_type: e.target.value as 'percentage' | 'flat' | 'bogo' })}
              >
                <option value="flat">Flat amount (₹)</option>
                <option value="percentage">Percentage (%)</option>
                <option value="bogo">Buy One Get One</option>
              </select>
            </div>
            <div className="form-group">
              <label>Discount Value *</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                className="form-input"
                value={formData.discount_value}
                onChange={e => setFormData({ ...formData, discount_value: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group" style={formData.discount_type !== 'percentage' ? { gridColumn: '1 / -1' } : undefined}>
              <label>Minimum Order Value</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-input"
                value={formData.min_order_value}
                onChange={e => setFormData({ ...formData, min_order_value: e.target.value })}
                placeholder="No minimum"
              />
            </div>
            {formData.discount_type === 'percentage' && (
              <div className="form-group">
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

          {!formData.requires_code && (
            <>
              <div className="form-group">
                <label>Applicable Scope *</label>
                <select
                  className="form-input"
                  value={formData.applicable_scope}
                  onChange={e => setFormData({ ...formData, applicable_scope: e.target.value as 'cart' | 'category' | 'product', applicable_ids: [] })}
                >
                  <option value="cart">Whole cart</option>
                  <option value="category">Specific categories</option>
                  <option value="product">Specific products</option>
                </select>
              </div>

              {formData.applicable_scope === 'category' && (
                <div className="form-group">
                  <label>Categories *</label>
                  <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem' }}>
                    {categories.map(c => (
                      <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', cursor: 'pointer' }}>
                        <input type="checkbox" checked={formData.applicable_ids.includes(c.id!)} onChange={() => toggleId(c.id!)} />
                        {c.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {formData.applicable_scope === 'product' && (
                <div className="form-group">
                  <label>Products *</label>
                  <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem' }}>
                    {products.map(p => (
                      <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', cursor: 'pointer' }}>
                        <input type="checkbox" checked={formData.applicable_ids.includes(p.id!)} onChange={() => toggleId(p.id!)} />
                        {p.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Usage Limits */}
        <div className="form-section">
          <p className="form-section-label">Usage Limits</p>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Usage Limit (total)</label>
              <input
                type="number"
                min="1"
                className="form-input"
                value={formData.usage_limit_total}
                onChange={e => setFormData({ ...formData, usage_limit_total: e.target.value })}
                placeholder="Unlimited"
              />
            </div>
            <div className="form-group">
              <label>Usage Limit (per user)</label>
              <input
                type="number"
                min="1"
                className="form-input"
                value={formData.usage_limit_per_user}
                onChange={e => setFormData({ ...formData, usage_limit_per_user: e.target.value })}
                placeholder="Unlimited"
              />
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="form-section">
          <p className="form-section-label">Schedule</p>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Start Date</label>
              <div className="promo-date-wrap">
                <input
                  type="date"
                  className="form-input promo-date-input"
                  value={formData.valid_from}
                  onChange={e => setFormData({ ...formData, valid_from: e.target.value })}
                />
                <Calendar size={15} className="promo-date-icon" />
              </div>
            </div>
            <div className="form-group">
              <label>End Date</label>
              <div className="promo-date-wrap">
                <input
                  type="date"
                  className="form-input promo-date-input"
                  value={formData.valid_until}
                  onChange={e => setFormData({ ...formData, valid_until: e.target.value })}
                  placeholder="No expiry"
                />
                <Calendar size={15} className="promo-date-icon" />
              </div>
            </div>
          </div>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" id="promotionActive" className="promo-checkbox" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} />
            <label htmlFor="promotionActive" style={{ margin: 0, cursor: 'pointer' }}>Active</label>
          </div>
        </div>
      </form>
    </Modal>
  );
}
