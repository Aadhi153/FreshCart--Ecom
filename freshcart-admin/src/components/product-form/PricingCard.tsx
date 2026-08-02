import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import type { Product } from '@freshcart/types';

interface PricingCardProps {
  register: UseFormRegister<Product>;
  errors: FieldErrors<Product>;
}

// Empty -> undefined so Zod's own required/optional semantics on ProductSchema
// produce the right message (required field -> "Required"; optional field -> valid).
// RHF's built-in valueAsNumber would turn '' into NaN, which passes the typeof
// number check and fails .min(0) with a misleading "must be positive" on an
// untouched field.
const asNumber = (v: string) => (v === '' ? undefined : Number(v));

export default function PricingCard({ register, errors }: PricingCardProps) {
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
            {...register('price', { setValueAs: asNumber })}
          />
          {errors.price && <p className="pf-error">{errors.price.message}</p>}
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
            {...register('compare_at_price', { setValueAs: asNumber })}
          />
          {errors.compare_at_price && <p className="pf-error">{errors.compare_at_price.message}</p>}
        </div>
      </div>
    </div>
  );
}
