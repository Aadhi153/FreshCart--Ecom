import { Calendar } from 'lucide-react';
import type { PromotionFormData } from './types';

interface ScheduleCardProps {
  formData: PromotionFormData;
  onChange: (patch: Partial<PromotionFormData>) => void;
}

export default function ScheduleCard({ formData, onChange }: ScheduleCardProps) {
  return (
    <div className="pf-card">
      <h3 className="pf-card-title">Schedule</h3>

      <div className="pf-subgrid" style={{ marginBottom: '16px' }}>
        <div className="pf-field" style={{ marginBottom: 0 }}>
          <label className="pf-label" htmlFor="promo-start-date">Start Date</label>
          <div className="promo-date-wrap">
            <input
              id="promo-start-date"
              type="date"
              className="pf-input promo-date-input"
              value={formData.valid_from}
              onChange={e => onChange({ valid_from: e.target.value })}
            />
            <Calendar size={15} className="promo-date-icon" />
          </div>
        </div>
        <div className="pf-field" style={{ marginBottom: 0 }}>
          <label className="pf-label" htmlFor="promo-end-date">End Date</label>
          <div className="promo-date-wrap">
            <input
              id="promo-end-date"
              type="date"
              className="pf-input promo-date-input"
              value={formData.valid_until}
              onChange={e => onChange({ valid_until: e.target.value })}
            />
            <Calendar size={15} className="promo-date-icon" />
          </div>
        </div>
      </div>

      <div className="pf-status-row" style={{ justifyContent: 'flex-start', gap: '0.6rem' }}>
        <input
          type="checkbox"
          id="promo-active"
          className="promo-checkbox"
          checked={formData.is_active}
          onChange={e => onChange({ is_active: e.target.checked })}
        />
        <label htmlFor="promo-active" className="pf-status-label" style={{ cursor: 'pointer' }}>Active</label>
      </div>
    </div>
  );
}
