import type { Category, Product } from '@freshcart/types';
import type { PromotionFormData, PromotionTierFormData } from './types';
import Dropdown from '../Dropdown';

const DISCOUNT_TYPE_OPTIONS = [
  { value: 'flat', label: 'Flat amount (₹)' },
  { value: 'percentage', label: 'Percentage (%)' },
  { value: 'bogo', label: 'Buy One Get One' },
  { value: 'free_shipping', label: 'Free Shipping' },
  { value: 'gift_with_purchase', label: 'Free Gift' },
];

const SCOPE_OPTIONS = [
  { value: 'cart', label: 'Whole cart' },
  { value: 'category', label: 'Specific categories' },
  { value: 'product', label: 'Specific products' },
];

const TIER_TYPE_OPTIONS = [
  { value: 'flat', label: '₹ off' },
  { value: 'percentage', label: '% off' },
];

interface DiscountRulesCardProps {
  formData: PromotionFormData;
  categories: Category[];
  products: Product[];
  onChange: (patch: Partial<PromotionFormData>) => void;
  onToggleApplicableId: (id: string) => void;
}

export default function DiscountRulesCard({ formData, categories, products, onChange, onToggleApplicableId }: DiscountRulesCardProps) {
  // free_shipping and gift_with_purchase are always cart-wide — shipping and the gift
  // itself are order-level concerns, not something scoped to a category/product. Coupons
  // can otherwise use any scope, same as auto-offers (see the backend's getMatchingItems,
  // which has never actually distinguished coupons from auto-offers here).
  const showScope = formData.discount_type !== 'free_shipping' && formData.discount_type !== 'gift_with_purchase';
  const showChecklist = showScope && formData.applicable_scope !== 'cart';
  const isGift = formData.discount_type === 'gift_with_purchase';
  // Tiers replace the flat/percentage discount_value with a spend ladder — doesn't make
  // sense for bogo/free_shipping/gift_with_purchase, which aren't a ₹-or-% amount at all.
  const supportsTiers = formData.discount_type === 'flat' || formData.discount_type === 'percentage';
  const hasNumericValue = supportsTiers && !formData.is_tiered;

  const handleDiscountTypeChange = (value: string) => {
    const nextType = value as PromotionFormData['discount_type'];
    const nextSupportsTiers = nextType === 'flat' || nextType === 'percentage';
    onChange({
      discount_type: nextType,
      // A tier ladder set up while flat/percentage was selected would otherwise survive
      // into bogo/free_shipping/gift_with_purchase and incorrectly override their own
      // discount logic server-side (tiers are checked before discount_type there).
      ...(nextSupportsTiers ? {} : { is_tiered: false, tiers: [] }),
    });
  };

  const updateTier = (index: number, patch: Partial<PromotionTierFormData>) => {
    onChange({ tiers: formData.tiers.map((t, i) => (i === index ? { ...t, ...patch } : t)) });
  };
  const addTier = () => {
    onChange({
      tiers: [...formData.tiers, {
        min_order_value: '',
        discount_type: formData.discount_type === 'percentage' ? 'percentage' : 'flat',
        discount_value: '',
      }],
    });
  };
  const removeTier = (index: number) => {
    onChange({ tiers: formData.tiers.filter((_, i) => i !== index) });
  };

  return (
    <div className="pf-card">
      <h3 className="pf-card-title">Discount Rules</h3>

      <div className="pf-subgrid" style={{ marginBottom: '16px' }}>
        <div className="pf-field" style={{ marginBottom: 0 }}>
          <label className="pf-label" htmlFor="promo-discount-type">Discount Type *</label>
          <Dropdown
            id="promo-discount-type"
            value={formData.discount_type}
            options={DISCOUNT_TYPE_OPTIONS}
            onChange={handleDiscountTypeChange}
          />
        </div>
        <div className="pf-field" style={{ marginBottom: 0 }}>
          <label className="pf-label" htmlFor="promo-discount-value">
            {hasNumericValue ? 'Discount Value *' : 'Discount Value'}
          </label>
          {formData.discount_type === 'bogo' ? (
            <p className="pf-note">Cheapest matching item is free — no value needed.</p>
          ) : formData.discount_type === 'free_shipping' ? (
            <p className="pf-note">Delivery fee is waived — no value needed.</p>
          ) : isGift ? (
            <p className="pf-note">Pick the free gift product below — no value needed.</p>
          ) : formData.is_tiered ? (
            <p className="pf-note">Discount value is set per tier below.</p>
          ) : (
            <input
              id="promo-discount-value"
              type="number"
              min="0"
              step="0.01"
              className="pf-input"
              value={formData.discount_value}
              onChange={e => onChange({ discount_value: Number(e.target.value) })}
            />
          )}
        </div>
      </div>

      {isGift && (
        <div className="pf-field" style={{ marginBottom: '16px' }}>
          <label className="pf-label">Gift Product *</label>
          <div className="pf-checklist">
            {products.map(p => (
              <label key={p.id} className="pf-checklist-row">
                <input
                  type="radio"
                  name="promo-gift-product"
                  checked={formData.gift_product_id === p.id}
                  onChange={() => onChange({ gift_product_id: p.id! })}
                />
                {p.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {supportsTiers && (
        <div className="pf-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginBottom: formData.is_tiered ? '12px' : '16px' }}>
          <input
            type="checkbox"
            id="promo-tiered"
            className="promo-checkbox"
            checked={formData.is_tiered}
            onChange={e => onChange({
              is_tiered: e.target.checked,
              tiers: e.target.checked && formData.tiers.length === 0
                ? [{ min_order_value: '', discount_type: formData.discount_type as 'flat' | 'percentage', discount_value: '' }]
                : formData.tiers,
            })}
          />
          <label htmlFor="promo-tiered" style={{ margin: 0, cursor: 'pointer' }}>
            Use spend tiers instead (e.g. 10% off ₹500+, 15% off ₹1000+)
          </label>
        </div>
      )}

      {supportsTiers && formData.is_tiered && (
        <div className="pf-field" style={{ marginBottom: '16px' }}>
          <label className="pf-label">Tiers *</label>
          {formData.tiers.map((tier, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
              <input
                type="number" min="0" step="0.01" className="pf-input" placeholder="Min order ₹"
                value={tier.min_order_value}
                onChange={e => updateTier(i, { min_order_value: e.target.value })}
                style={{ flex: 1, marginBottom: 0 }}
              />
              <div style={{ width: 110 }}>
                <Dropdown
                  value={tier.discount_type}
                  options={TIER_TYPE_OPTIONS}
                  onChange={value => updateTier(i, { discount_type: value as 'flat' | 'percentage' })}
                />
              </div>
              <input
                type="number" min="0" step="0.01" className="pf-input" placeholder="Value"
                value={tier.discount_value}
                onChange={e => updateTier(i, { discount_value: e.target.value })}
                style={{ flex: 1, marginBottom: 0 }}
              />
              <button
                type="button"
                onClick={() => removeTier(i)}
                disabled={formData.tiers.length === 1}
                className="btn-secondary"
                style={{ padding: '0.5rem 0.7rem' }}
              >
                ✕
              </button>
            </div>
          ))}
          <button type="button" className="btn-secondary" onClick={addTier}>+ Add tier</button>
        </div>
      )}

      {!formData.is_tiered && (
        <div className="pf-subgrid" style={{ marginBottom: showScope ? '16px' : 0 }}>
          <div className="pf-field" style={formData.discount_type !== 'percentage' ? { gridColumn: '1 / -1', marginBottom: 0 } : { marginBottom: 0 }}>
            <label className="pf-label" htmlFor="promo-min-order">Minimum Order Value</label>
            <input
              id="promo-min-order"
              type="number"
              min="0"
              step="0.01"
              className="pf-input"
              placeholder="No minimum"
              value={formData.min_order_value}
              onChange={e => onChange({ min_order_value: e.target.value })}
            />
          </div>
          {formData.discount_type === 'percentage' && (
            <div className="pf-field" style={{ marginBottom: 0 }}>
              <label className="pf-label" htmlFor="promo-max-cap">Max Discount Cap</label>
              <input
                id="promo-max-cap"
                type="number"
                min="0"
                step="0.01"
                className="pf-input"
                placeholder="No cap"
                value={formData.max_discount_amount}
                onChange={e => onChange({ max_discount_amount: e.target.value })}
              />
            </div>
          )}
        </div>
      )}

      {showScope && (
        <div className="pf-field" style={showChecklist ? undefined : { marginBottom: 0 }}>
          <label className="pf-label" htmlFor="promo-scope">Applicable Scope *</label>
          <Dropdown
            id="promo-scope"
            value={formData.applicable_scope}
            options={SCOPE_OPTIONS}
            onChange={value => onChange({ applicable_scope: value as PromotionFormData['applicable_scope'], applicable_ids: [] })}
          />
        </div>
      )}

      {showScope && formData.applicable_scope === 'category' && (
        <div className="pf-field" style={{ marginBottom: 0 }}>
          <label className="pf-label">Categories *</label>
          <div className="pf-checklist">
            {categories.map(c => (
              <label key={c.id} className="pf-checklist-row">
                <input type="checkbox" checked={formData.applicable_ids.includes(c.id!)} onChange={() => onToggleApplicableId(c.id!)} />
                {c.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {showScope && formData.applicable_scope === 'product' && (
        <div className="pf-field" style={{ marginBottom: 0 }}>
          <label className="pf-label">Products *</label>
          <div className="pf-checklist">
            {products.map(p => (
              <label key={p.id} className="pf-checklist-row">
                <input type="checkbox" checked={formData.applicable_ids.includes(p.id!)} onChange={() => onToggleApplicableId(p.id!)} />
                {p.name}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
