import { CheckCircle2, ClipboardList, Package, Truck, XCircle } from 'lucide-react';
import styles from './OrderTimeline.module.css';

const STEPS = ['placed', 'packed', 'shipped', 'delivered'] as const;
const STEP_ICONS = { placed: ClipboardList, packed: Package, shipped: Truck, delivered: CheckCircle2 };

interface OrderTimelineProps {
  status: string;
}

export function OrderTimeline({ status }: OrderTimelineProps) {
  if (status === 'cancelled') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--danger, #B91C1C)', fontWeight: 700, fontSize: '0.85rem', margin: '0.6rem 0' }}>
        <XCircle size={16} /> Order cancelled
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
            <span className={`${styles.stepLabel} ${done ? styles.stepLabelDone : ''}`}>{s}</span>
          </div>
        );
      })}
    </div>
  );
}
