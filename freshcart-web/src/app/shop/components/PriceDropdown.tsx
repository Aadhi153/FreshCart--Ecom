'use client';

import { forwardRef, type CSSProperties } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { PRICE_BUCKETS, type PriceBucketKey } from '../filters';
import styles from './FilterBar.module.css';

interface PriceDropdownProps {
  value: PriceBucketKey;
  isOpen: boolean;
  onToggle: () => void;
  onChange: (value: PriceBucketKey) => void;
}

// Increasing teal intensity per tier gives a quick visual read of "how expensive"
// without introducing off-brand colors; the "All Prices" row gets a neutral outline dot.
const DOT_INTENSITY: Record<PriceBucketKey, string> = {
  all: 'color-mix(in srgb, var(--text-secondary) 35%, transparent)',
  'under-50': 'color-mix(in srgb, var(--primary) 35%, transparent)',
  '50-100': 'color-mix(in srgb, var(--primary) 55%, transparent)',
  '100-200': 'color-mix(in srgb, var(--primary) 72%, transparent)',
  '200-500': 'color-mix(in srgb, var(--primary) 88%, transparent)',
  'above-500': 'var(--primary)',
};

export const PriceDropdown = forwardRef<HTMLDivElement, PriceDropdownProps>(function PriceDropdown(
  { value, isOpen, onToggle, onChange },
  ref,
) {
  const selected = PRICE_BUCKETS.find((b) => b.key === value) ?? PRICE_BUCKETS[0];

  return (
    <div className={styles.dropdownContainer} ref={ref}>
      <button type="button" className={styles.dropdownTrigger} onClick={onToggle}>
        {value === 'all' ? 'Price' : `Price: ${selected.label}`}
        <ChevronDown size={14} className={isOpen ? styles.chevronOpen : ''} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={styles.dropdownPanel}
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            {PRICE_BUCKETS.map((bucket) => (
              <button
                key={bucket.key}
                type="button"
                className={`${styles.dropdownRow} ${bucket.key === value ? styles.dropdownRowActive : ''}`}
                onClick={() => { onChange(bucket.key); onToggle(); }}
              >
                <span className={styles.dropdownRowLabel}>
                  <span className={styles.priceDot} style={{ '--dot-color': DOT_INTENSITY[bucket.key] } as CSSProperties} />
                  {bucket.label}
                </span>
                {bucket.key === value && <Check size={14} color="var(--primary)" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
