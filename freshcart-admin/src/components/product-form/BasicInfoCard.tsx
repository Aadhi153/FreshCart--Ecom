import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import type { Product } from '@freshcart/types';

interface BasicInfoCardProps {
  register: UseFormRegister<Product>;
  errors: FieldErrors<Product>;
}

export default function BasicInfoCard({ register, errors }: BasicInfoCardProps) {
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
          {...register('name')}
        />
        {errors.name && <p className="pf-error">{errors.name.message}</p>}
      </div>

      <div className="pf-field" style={{ marginBottom: 0 }}>
        <label className="pf-label" htmlFor="pf-description">Description</label>
        <textarea
          id="pf-description"
          className="pf-textarea"
          placeholder="Short product description"
          rows={3}
          {...register('description')}
        />
      </div>
    </div>
  );
}
