import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { Category, Product, Promotion } from '@freshcart/types';
import { createPromotion, getCategories, getProducts } from '../../lib/api';
import { useToast } from '../ToastProvider';
import BasicInfoCard from './BasicInfoCard';
import DiscountRulesCard from './DiscountRulesCard';
import UsageLimitsCard from './UsageLimitsCard';
import ScheduleCard from './ScheduleCard';
import { EMPTY_PROMOTION_FORM } from './types';
import type { PromotionFormData } from './types';

export default function PromotionFormPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState<PromotionFormData>(EMPTY_PROMOTION_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
    getProducts().then(setProducts).catch(() => {});
  }, []);

  const patch = (fields: Partial<PromotionFormData>) => setFormData(prev => ({ ...prev, ...fields }));

  const toggleApplicableId = (id: string) => {
    setFormData(prev => ({
      ...prev,
      applicable_ids: prev.applicable_ids.includes(id)
        ? prev.applicable_ids.filter(x => x !== id)
        : [...prev.applicable_ids, id],
    }));
  };

  const isValid = useMemo(() => (
    formData.name.trim().length > 0 &&
    (!formData.requires_code || formData.code.trim().length > 0) &&
    !!formData.discount_type &&
    Number(formData.discount_value) > 0
  ), [formData]);

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
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
      await createPromotion(payload);
      showToast('Promotion created', 'success');
      navigate('/promotions');
    } catch (error) {
      console.error('Error saving promotion:', error);
      const message = error instanceof Error ? error.message : 'Failed to save promotion.';
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="product-form-page">
      <header className="pf-header">
        <button type="button" className="pf-breadcrumb" onClick={() => navigate('/promotions')}>
          <ArrowLeft size={13} /> Back to Promotions
        </button>
        <div className="pf-titlebar">
          <h1 className="pf-title">Add New Promotion</h1>
          <div className="pf-header-actions">
            <button
              type="button"
              className="btn-secondary"
              disabled={saving}
              onClick={() => navigate('/promotions')}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={!isValid || saving}
              onClick={handleSave}
            >
              {saving ? 'Creating…' : 'Create Promotion'}
            </button>
          </div>
        </div>
      </header>

      <div className="pf-body">
        <div className="pf-grid">
          <div className="pf-col pf-col-main">
            <BasicInfoCard formData={formData} onChange={patch} />
            <DiscountRulesCard
              formData={formData}
              categories={categories}
              products={products}
              onChange={patch}
              onToggleApplicableId={toggleApplicableId}
            />
          </div>
          <div className="pf-col pf-col-side">
            <UsageLimitsCard formData={formData} onChange={patch} />
            <ScheduleCard formData={formData} onChange={patch} />
          </div>
        </div>
      </div>
    </div>
  );
}
