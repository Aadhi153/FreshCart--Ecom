import { CheckCircle2, ClipboardList, PackageCheck, ThumbsUp, XCircle } from 'lucide-react';
import type { ReturnRequestStatus } from '@freshcart/types';
import styles from './OrderTimeline.module.css';

const STEPS = ['requested', 'approved', 'picked_up', 'completed'] as const;
const STEP_ICONS = { requested: ClipboardList, approved: ThumbsUp, picked_up: PackageCheck, completed: CheckCircle2 };
const STEP_LABELS: Record<(typeof STEPS)[number], string> = {
  requested: 'Requested',
  approved: 'Approved',
  picked_up: 'Picked up',
  completed: 'Completed',
};

interface ReturnTimelineProps {
  status: ReturnRequestStatus;
}

export function ReturnTimeline({ status }: ReturnTimelineProps) {
  if (status === 'rejected') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--danger, #B91C1C)', fontWeight: 700, fontSize: '0.85rem', margin: '0.6rem 0' }}>
        <XCircle size={16} /> Request rejected
      </div>
    );
  }

  const stepIndex = STEPS.indexOf(status as (typeof STEPS)[number]);

  return (
    <div className={styles.stepper}>
      {STEPS.map((s, i) => {
        const Icon = STEP_ICONS[s];
        const done = i <= stepIndex;
        return (
          <div key={s} className={styles.step}>
            <span className={`${styles.stepIcon} ${done ? styles.stepIconDone : ''}`}>
              <Icon size={13} />
            </span>
            <span className={`${styles.stepLabel} ${done ? styles.stepLabelDone : ''}`}>{STEP_LABELS[s]}</span>
          </div>
        );
      })}
    </div>
  );
}
