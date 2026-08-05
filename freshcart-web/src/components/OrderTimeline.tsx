import { Fragment } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ClipboardList, Package, Truck, XCircle } from 'lucide-react';
import styles from './OrderTimeline.module.css';

const STEPS = ['placed', 'packed', 'shipped', 'delivered'] as const;
const STEP_ICONS = { placed: ClipboardList, packed: Package, shipped: Truck, delivered: CheckCircle2 };

interface OrderTimelineProps {
  status: string;
  // Only Placed/Delivered have a real timestamp today (order creation + delivered_at) —
  // Packed/Shipped aren't stamped anywhere in the schema, so they're left without one
  // rather than showing a fabricated time.
  timestamps?: Partial<Record<(typeof STEPS)[number], string | null | undefined>>;
}

function formatStamp(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function OrderTimeline({ status, timestamps }: OrderTimelineProps) {
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
        const lineFilled = i < stepIndex;
        const stamp = formatStamp(timestamps?.[s]);
        const title = stamp ? `${s[0].toUpperCase()}${s.slice(1)} — ${stamp}` : `${s[0].toUpperCase()}${s.slice(1)}`;

        return (
          <Fragment key={s}>
            <div className={styles.step} title={title}>
              <span className={`${styles.stepIcon} ${done ? styles.stepIconDone : ''}`}>
                <Icon size={14} />
              </span>
              <span className={`${styles.stepLabel} ${done ? styles.stepLabelDone : ''}`}>{s}</span>
              {stamp && <span className={styles.stepStamp}>{stamp}</span>}
            </div>
            {i < STEPS.length - 1 && (
              <div className={styles.line}>
                <motion.div
                  className={styles.lineFill}
                  initial={false}
                  animate={{ width: lineFilled ? '100%' : '0%' }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                />
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
