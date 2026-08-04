import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { Category, Product, Promotion } from '@freshcart/types';
import { createPromotion, updatePromotion, getCategories, getProducts } from '../../lib/api';
import { useToast } from '../ToastProvider';
import BasicInfoCard from './BasicInfoCard';
import DiscountRulesCard from './DiscountRulesCard';
import UsageLimitsCard from './UsageLimitsCard';
import ScheduleCard from './ScheduleCard';
import { EMPTY_PROMOTION_FORM } from './types';
import type { PromotionFormData } from './types';

function toFormData(promotion: Promotion): PromotionFormData {
  return {
    name: promotion.name,
    description: promotion.description ?? '',
    is_public: promotion.is_public ?? false,
    requires_code: promotion.requires_code,
    code: promotion.code ?? '',
    discount_type: promotion.discount_type,
    discount_value: promotion.discount_value,
    min_order_value: promotion.min_order_value != null ? String(promotion.min_order_value) : '',
    max_discount_amount: promotion.max_discount_amount != null ? String(promotion.max_discount_amount) : '',
    applicable_scope: promotion.applicable_scope,
    applicable_ids: promotion.applicable_ids ?? [],
    usage_limit_total: promotion.usage_limit_total != null ? String(promotion.usage_limit_total) : '',
    usage_limit_per_user: promotion.usage_limit_per_user != null ? String(promotion.usage_limit_per_user) : '',
    valid_from: promotion.valid_from ? promotion.valid_from.slice(0, 10) : new Date().toISOString().slice(0, 10),
    valid_until: promotion.valid_until ? promotion.valid_until.slice(0, 10) : '',
    is_active: promotion.is_active,
    first_order_only: promotion.first_order_only ?? false,
    target_segment: promotion.target_segment ?? 'all',
    is_tiered: !!(promotion.tiers && promotion.tiers.length > 0),
    tiers: (promotion.tiers ?? []).map((t) => ({
      min_order_value: String(t.min_order_value),
      discount_type: t.discount_type,
      discount_value: String(t.discount_value),
    })),
    recurrence_enabled: promotion.recurrence != null,
    recurrence_day_of_week: promotion.recurrence?.day_of_week != null ? String(promotion.recurrence.day_of_week) : '0',
    gift_product_id: promotion.gift_product_id ?? '',
  };
}

interface PromotionFormPageProps {
  editingPromotion?: Promotion | null;
}

export default function PromotionFormPage({ editingPromotion = null }: PromotionFormPageProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState<PromotionFormData>(
    editingPromotion ? toFormData(editingPromotion) : EMPTY_PROMOTION_FORM
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingPromotion) setFormData(toFormData(editingPromotion));
  }, [editingPromotion]);

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

  const isValid = useMemo(() => {
    if (formData.name.trim().length === 0) return false;
    if (formData.requires_code && formData.code.trim().length === 0) return false;
    if (!formData.discount_type) return false;
    if (formData.discount_type === 'gift_with_purchase') return formData.gift_product_id.trim().length > 0;
    if (formData.is_tiered) {
      return formData.tiers.length > 0 && formData.tiers.every((t) =>
        t.min_order_value.trim().length > 0 && t.discount_value.trim().length > 0 && Number(t.discount_value) > 0
      );
    }
    return formData.discount_type === 'bogo' || formData.discount_type === 'free_shipping' || Number(formData.discount_value) > 0;
  }, [formData]);

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    try {
      // Coupons can use any scope (see DiscountRulesCard); free_shipping and
      // gift_with_purchase are always cart-wide — shipping and the gift itself are
      // order-level concerns, not something that makes sense scoped to an item.
      const scope = (formData.discount_type === 'free_shipping' || formData.discount_type === 'gift_with_purchase')
        ? 'cart'
        : formData.applicable_scope;
      const isGift = formData.discount_type === 'gift_with_purchase';
      const hasNoNumericValue = formData.discount_type === 'bogo' || formData.discount_type === 'free_shipping' || isGift;
      const supportsTiers = formData.discount_type === 'flat' || formData.discount_type === 'percentage';
      const isTiered = formData.is_tiered && supportsTiers;

      const payload: Partial<Promotion> = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        is_public: formData.requires_code ? formData.is_public : true,
        requires_code: formData.requires_code,
        code: formData.requires_code ? formData.code.trim() : null,
        discount_type: formData.discount_type,
        discount_value: hasNoNumericValue ? 0 : Number(formData.discount_value),
        // Tiers replace min_order_value/discount_value entirely when active — see
        // computeDiscountForCart in the backend.
        min_order_value: isTiered ? null : (formData.min_order_value ? Number(formData.min_order_value) : null),
        max_discount_amount: formData.max_discount_amount ? Number(formData.max_discount_amount) : null,
        applicable_scope: scope,
        applicable_ids: scope === 'cart' ? null : formData.applicable_ids,
        usage_limit_total: formData.usage_limit_total ? Number(formData.usage_limit_total) : null,
        usage_limit_per_user: formData.usage_limit_per_user ? Number(formData.usage_limit_per_user) : null,
        valid_from: formData.valid_from ? new Date(formData.valid_from).toISOString() : undefined,
        valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
        is_active: formData.is_active,
        first_order_only: formData.first_order_only,
        target_segment: formData.target_segment,
        tiers: isTiered
          ? formData.tiers.map((t) => ({
              min_order_value: Number(t.min_order_value),
              discount_type: t.discount_type,
              discount_value: Number(t.discount_value),
            }))
          : null,
        recurrence: formData.recurrence_enabled ? { day_of_week: Number(formData.recurrence_day_of_week) } : null,
        gift_product_id: isGift ? formData.gift_product_id : null,
      };
      if (editingPromotion) {
        await updatePromotion(editingPromotion.id!, payload);
        showToast('Promotion updated', 'success');
      } else {
        await createPromotion(payload);
        showToast('Promotion created', 'success');
      }
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
          <h1 className="pf-title">{editingPromotion ? 'Edit Promotion' : 'Add New Promotion'}</h1>
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
              {saving ? (editingPromotion ? 'Saving…' : 'Creating…') : (editingPromotion ? 'Save Promotion' : 'Create Promotion')}
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
