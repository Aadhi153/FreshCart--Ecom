import type { ProductFormData } from './types';

interface PricingCardProps {
  formData: ProductFormData;
  onChange: (patch: Partial<ProductFormData>) => void;
}

export default function PricingCard({ formData, onChange }: PricingCardProps) {
  return (
    <div className="pf-card">
      <h3 className="pf-card-title">Pricing</h3>

      <div className="pf-subgrid" style={{ marginBottom: 0 }}>
        <div className="pf-field" style={{ marginBottom: 0 }}>
          <label className="pf-label" htmlFor="pf-price">Price *</label>
          <input
            id="pf-price"
            type="number"
            min="0"
            step="0.01"
            className="pf-input"
            placeholder="0.00"
            value={formData.price}
            onChange={e => onChange({ price: e.target.value })}
          />
        </div>
        <div className="pf-field" style={{ marginBottom: 0 }}>
          <label className="pf-label" htmlFor="pf-compare-price">Compare-at Price</label>
          <input
            id="pf-compare-price"
            type="number"
            min="0"
            step="0.01"
            className="pf-input"
            placeholder="0.00"
            value={formData.compareAtPrice}
            onChange={e => onChange({ compareAtPrice: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
