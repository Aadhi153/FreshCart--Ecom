import type { Category } from '@freshcart/types';
import type { ProductFormData } from './types';
import { UNIT_OPTIONS } from './types';

interface OrganizationCardProps {
  formData: ProductFormData;
  categories: Category[];
  onChange: (patch: Partial<ProductFormData>) => void;
}

export default function OrganizationCard({ formData, categories, onChange }: OrganizationCardProps) {
  return (
    <div className="pf-card">
      <h3 className="pf-card-title">Organization</h3>

      <div className="pf-field">
        <label className="pf-label" htmlFor="pf-category">Category *</label>
        <select
          id="pf-category"
          className="pf-select"
          value={formData.categoryId}
          onChange={e => onChange({ categoryId: e.target.value })}
        >
          <option value="">Select a category</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="pf-field" style={{ marginBottom: 0 }}>
        <label className="pf-label" htmlFor="pf-unit">Unit</label>
        <select
          id="pf-unit"
          className="pf-select"
          value={formData.unit}
          onChange={e => onChange({ unit: e.target.value })}
        >
          <option value="">Select a unit</option>
          {UNIT_OPTIONS.map(u => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
