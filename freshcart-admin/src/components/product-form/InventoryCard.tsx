import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import type { Product } from '@freshcart/types';

interface InventoryCardProps {
  register: UseFormRegister<Product>;
  errors: FieldErrors<Product>;
}

const asNumber = (v: string) => (v === '' ? undefined : Number(v));

export default function InventoryCard({ register, errors }: InventoryCardProps) {
  return (
    <div className="pf-card">
      <h3 className="pf-card-title">Inventory</h3>

      <div className="pf-subgrid" style={{ marginBottom: 0 }}>
        <div className="pf-field" style={{ marginBottom: 0 }}>
          <label className="pf-label" htmlFor="pf-stock">Stock Quantity *</label>
          <input
            id="pf-stock"
            type="number"
            min="0"
            step="1"
            className="pf-input"
            placeholder="0"
            {...register('stock_quantity', { setValueAs: asNumber })}
          />
          {errors.stock_quantity && <p className="pf-error">{errors.stock_quantity.message}</p>}
        </div>
        <div className="pf-field" style={{ marginBottom: 0 }}>
          <label className="pf-label" htmlFor="pf-low-stock">Low Stock Alert At</label>
          <input
            id="pf-low-stock"
            type="number"
            min="0"
            step="1"
            className="pf-input"
            placeholder="e.g. 10"
            {...register('low_stock_threshold', { setValueAs: asNumber })}
          />
          {errors.low_stock_threshold && <p className="pf-error">{errors.low_stock_threshold.message}</p>}
        </div>
      </div>
    </div>
  );
}
