import type { ProductFormData } from './types';

interface InventoryCardProps {
  formData: ProductFormData;
  onChange: (patch: Partial<ProductFormData>) => void;
}

export default function InventoryCard({ formData, onChange }: InventoryCardProps) {
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
            value={formData.stockQuantity}
            onChange={e => onChange({ stockQuantity: e.target.value })}
          />
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
            value={formData.lowStockThreshold}
            onChange={e => onChange({ lowStockThreshold: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
