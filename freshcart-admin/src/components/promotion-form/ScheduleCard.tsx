import { Calendar } from 'lucide-react';
import type { PromotionFormData } from './types';
import Dropdown from '../Dropdown';

const WEEKDAY_OPTIONS = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

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

      <div className="pf-status-row" style={{ justifyContent: 'flex-start', gap: '0.6rem', marginTop: '14px' }}>
        <input
          type="checkbox"
          id="promo-recurrence-enabled"
          className="promo-checkbox"
          checked={formData.recurrence_enabled}
          onChange={e => onChange({ recurrence_enabled: e.target.checked })}
        />
        <label htmlFor="promo-recurrence-enabled" className="pf-status-label" style={{ cursor: 'pointer' }}>
          Repeat weekly
        </label>
      </div>

      {formData.recurrence_enabled && (
        <div className="pf-field" style={{ marginTop: '10px', marginBottom: 0 }}>
          <label className="pf-label" htmlFor="promo-recurrence-day">Only active on</label>
          <Dropdown
            id="promo-recurrence-day"
            value={formData.recurrence_day_of_week}
            options={WEEKDAY_OPTIONS}
            onChange={value => onChange({ recurrence_day_of_week: value })}
          />
        </div>
      )}
    </div>
  );
}
