import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import type { Category, Product } from '@freshcart/types';
import { UNIT_OPTIONS } from './types';

interface OrganizationCardProps {
  register: UseFormRegister<Product>;
  errors: FieldErrors<Product>;
  categories: Category[];
}

const emptyToUndefined = (v: string) => (v === '' ? undefined : v);

export default function OrganizationCard({ register, errors, categories }: OrganizationCardProps) {
  return (
    <div className="pf-card">
      <h3 className="pf-card-title">Organization</h3>

      <div className="pf-field">
        <label className="pf-label" htmlFor="pf-category">Category *</label>
        <select
          id="pf-category"
          className="pf-select"
          {...register('category_id', { setValueAs: emptyToUndefined })}
        >
          <option value="">Select a category</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {errors.category_id && <p className="pf-error">{errors.category_id.message}</p>}
      </div>

      <div className="pf-field" style={{ marginBottom: 0 }}>
        <label className="pf-label" htmlFor="pf-unit">Unit</label>
        <select
          id="pf-unit"
          className="pf-select"
          {...register('unit', { setValueAs: emptyToUndefined })}
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
