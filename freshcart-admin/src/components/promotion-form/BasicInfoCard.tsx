import type { PromotionFormData } from './types';

interface BasicInfoCardProps {
  formData: PromotionFormData;
  onChange: (patch: Partial<PromotionFormData>) => void;
}

export default function BasicInfoCard({ formData, onChange }: BasicInfoCardProps) {
  return (
    <div className="pf-card">
      <h3 className="pf-card-title">Basic Info</h3>

      <div className="pf-field" style={{ flexDirection: 'row', gap: '0.5rem' }}>
        <button
          type="button"
          className={formData.requires_code ? 'btn-primary' : 'btn-secondary'}
          style={{ flex: 1 }}
          onClick={() => onChange({ requires_code: true })}
        >
          Coupon
        </button>
        <button
          type="button"
          className={!formData.requires_code ? 'btn-primary' : 'btn-secondary'}
          style={{ flex: 1 }}
          onClick={() => onChange({ requires_code: false, code: '' })}
        >
          Auto-Offer
        </button>
      </div>

      <div className="pf-field" style={!formData.requires_code ? { marginBottom: 0 } : undefined}>
        <label className="pf-label" htmlFor="promo-name">Name *</label>
        <input
          id="promo-name"
          type="text"
          className="pf-input"
          placeholder="e.g. Dairy Week Sale"
          value={formData.name}
          onChange={e => onChange({ name: e.target.value })}
        />
      </div>

      {formData.requires_code && (
        <div className="pf-field" style={{ marginBottom: 0 }}>
          <label className="pf-label" htmlFor="promo-code">Coupon Code *</label>
          <input
            id="promo-code"
            type="text"
            className="pf-input"
            style={{ textTransform: 'uppercase' }}
            placeholder="e.g. WELCOME10"
            value={formData.code}
            onChange={e => onChange({ code: e.target.value.toUpperCase() })}
          />
        </div>
      )}
    </div>
  );
}
