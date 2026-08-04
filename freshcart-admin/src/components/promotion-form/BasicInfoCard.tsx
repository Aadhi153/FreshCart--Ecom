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

      <div className="pf-field" style={{ marginTop: '12px' }}>
        <label className="pf-label" htmlFor="promo-description">Customer-Facing Description</label>
        <textarea
          id="promo-description"
          className="pf-input"
          rows={2}
          placeholder='Shown on the /offers page and homepage banner, e.g. "10% off all dairy this weekend."'
          value={formData.description}
          onChange={e => onChange({ description: e.target.value })}
        />
      </div>

      {formData.requires_code && (
        <div className="pf-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginBottom: 0 }}>
          <input
            type="checkbox"
            id="promo-is-public"
            className="promo-checkbox"
            checked={formData.is_public}
            onChange={e => onChange({ is_public: e.target.checked })}
          />
          <label htmlFor="promo-is-public" style={{ margin: 0, cursor: 'pointer' }}>
            List on /offers &amp; homepage (auto-offers are always listed)
          </label>
        </div>
      )}
    </div>
  );
}
