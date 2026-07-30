import type { PromotionFormData } from './types';

interface UsageLimitsCardProps {
  formData: PromotionFormData;
  onChange: (patch: Partial<PromotionFormData>) => void;
}

export default function UsageLimitsCard({ formData, onChange }: UsageLimitsCardProps) {
  return (
    <div className="pf-card">
      <h3 className="pf-card-title">Usage Limits</h3>

      <div className="pf-field">
        <label className="pf-label" htmlFor="promo-usage-total">Usage Limit (total)</label>
        <input
          id="promo-usage-total"
          type="number"
          min="1"
          className="pf-input"
          placeholder="Unlimited"
          value={formData.usage_limit_total}
          onChange={e => onChange({ usage_limit_total: e.target.value })}
        />
      </div>

      <div className="pf-field" style={{ marginBottom: 0 }}>
        <label className="pf-label" htmlFor="promo-usage-per-user">Usage Limit (per user)</label>
        <input
          id="promo-usage-per-user"
          type="number"
          min="1"
          className="pf-input"
          placeholder="Unlimited"
          value={formData.usage_limit_per_user}
          onChange={e => onChange({ usage_limit_per_user: e.target.value })}
        />
      </div>
    </div>
  );
}
