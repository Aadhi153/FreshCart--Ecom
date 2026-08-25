import type { PromotionFormData } from './types';
import Dropdown from '../Dropdown';

const SEGMENT_OPTIONS = [
  { value: 'all', label: 'All customers' },
  { value: 'vip', label: 'VIP customers' },
  { value: 'referral', label: 'Referred customers' },
  { value: 'inactive_30_days', label: 'Inactive 30+ days (win-back)' },
  { value: 'birthday', label: "Birthday month" },
];

interface UsageLimitsCardProps {
  formData: PromotionFormData;
  onChange: (patch: Partial<PromotionFormData>) => void;
}

export default function UsageLimitsCard({ formData, onChange }: UsageLimitsCardProps) {
  return (
    <div className="pf-card">
      <h3 className="pf-card-title">Eligibility &amp; Usage Limits</h3>

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

      <div className="pf-field">
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

      <div className="pf-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
        <input
          type="checkbox"
          id="promo-first-order-only"
          className="promo-checkbox"
          checked={formData.first_order_only}
          onChange={e => onChange({ first_order_only: e.target.checked })}
        />
        <label htmlFor="promo-first-order-only" style={{ margin: 0, cursor: 'pointer' }}>
          First order only (new customers)
        </label>
      </div>

      <div className="pf-field" style={{ marginBottom: 0 }}>
        <label className="pf-label" htmlFor="promo-segment">Customer Segment</label>
        <Dropdown
          id="promo-segment"
          value={formData.target_segment}
          options={SEGMENT_OPTIONS}
          onChange={value => onChange({ target_segment: value as PromotionFormData['target_segment'] })}
        />
      </div>
    </div>
  );
}
