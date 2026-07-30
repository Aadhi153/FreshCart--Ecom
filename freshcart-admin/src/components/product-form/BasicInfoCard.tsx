import type { ProductFormData } from './types';

interface BasicInfoCardProps {
  formData: ProductFormData;
  onChange: (patch: Partial<ProductFormData>) => void;
}

export default function BasicInfoCard({ formData, onChange }: BasicInfoCardProps) {
  return (
    <div className="pf-card">
      <h3 className="pf-card-title">Basic Information</h3>

      <div className="pf-field">
        <label className="pf-label" htmlFor="pf-name">Product Name *</label>
        <input
          id="pf-name"
          type="text"
          className="pf-input"
          placeholder="e.g. Organic Carrots"
          value={formData.name}
          onChange={e => onChange({ name: e.target.value })}
        />
      </div>

      <div className="pf-field" style={{ marginBottom: 0 }}>
        <label className="pf-label" htmlFor="pf-description">Description</label>
        <textarea
          id="pf-description"
          className="pf-textarea"
          placeholder="Short product description"
          rows={3}
          value={formData.description}
          onChange={e => onChange({ description: e.target.value })}
        />
      </div>
    </div>
  );
}
