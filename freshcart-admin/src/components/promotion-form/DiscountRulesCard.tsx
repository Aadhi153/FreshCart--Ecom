import type { Category, Product } from '@freshcart/types';
import type { PromotionFormData } from './types';

interface DiscountRulesCardProps {
  formData: PromotionFormData;
  categories: Category[];
  products: Product[];
  onChange: (patch: Partial<PromotionFormData>) => void;
  onToggleApplicableId: (id: string) => void;
}

export default function DiscountRulesCard({ formData, categories, products, onChange, onToggleApplicableId }: DiscountRulesCardProps) {
  const showScope = !formData.requires_code;
  const showChecklist = showScope && formData.applicable_scope !== 'cart';

  return (
    <div className="pf-card">
      <h3 className="pf-card-title">Discount Rules</h3>

      <div className="pf-subgrid" style={{ marginBottom: '16px' }}>
        <div className="pf-field" style={{ marginBottom: 0 }}>
          <label className="pf-label" htmlFor="promo-discount-type">Discount Type *</label>
          <select
            id="promo-discount-type"
            className="pf-select"
            value={formData.discount_type}
            onChange={e => onChange({ discount_type: e.target.value as PromotionFormData['discount_type'] })}
          >
            <option value="flat">Flat amount (₹)</option>
            <option value="percentage">Percentage (%)</option>
            <option value="bogo">Buy One Get One</option>
          </select>
        </div>
        <div className="pf-field" style={{ marginBottom: 0 }}>
          <label className="pf-label" htmlFor="promo-discount-value">Discount Value *</label>
          <input
            id="promo-discount-value"
            type="number"
            min="0"
            step="0.01"
            className="pf-input"
            value={formData.discount_value}
            onChange={e => onChange({ discount_value: Number(e.target.value) })}
          />
        </div>
      </div>

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

      {showScope && (
        <div className="pf-field" style={showChecklist ? undefined : { marginBottom: 0 }}>
          <label className="pf-label" htmlFor="promo-scope">Applicable Scope *</label>
          <select
            id="promo-scope"
            className="pf-select"
            value={formData.applicable_scope}
            onChange={e => onChange({ applicable_scope: e.target.value as PromotionFormData['applicable_scope'], applicable_ids: [] })}
          >
            <option value="cart">Whole cart</option>
            <option value="category">Specific categories</option>
            <option value="product">Specific products</option>
          </select>
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
