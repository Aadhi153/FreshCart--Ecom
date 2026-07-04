'use client';

import { useRef } from 'react';
import { Check, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useClickOutside } from '../../../lib/useClickOutside';
import { PRICE_BUCKETS, SORT_OPTIONS, type PriceBucketKey, type SortKey } from '../filters';
import styles from './FilterBar.module.css';

interface MobileFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  priceBucket: PriceBucketKey;
  onPriceBucketChange: (value: PriceBucketKey) => void;
  sortBy: SortKey;
  onSortByChange: (value: SortKey) => void;
}

export function MobileFilterSheet({
  isOpen,
  onClose,
  priceBucket,
  onPriceBucketChange,
  sortBy,
  onSortByChange,
}: MobileFilterSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  useClickOutside([sheetRef], onClose, isOpen);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className={styles.sheetBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            ref={sheetRef}
            className={styles.sheet}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className={styles.sheetHeader}>
              <h3>Filters</h3>
              <button type="button" onClick={onClose} aria-label="Close filters" className={styles.sheetCloseBtn}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.sheetSection}>
              <span className={styles.sheetSectionLabel}>Price</span>
              {PRICE_BUCKETS.map((bucket) => (
                <button
                  key={bucket.key}
                  type="button"
                  className={`${styles.dropdownRow} ${bucket.key === priceBucket ? styles.dropdownRowActive : ''}`}
                  onClick={() => onPriceBucketChange(bucket.key)}
                >
                  {bucket.label}
                  {bucket.key === priceBucket && <Check size={14} color="var(--primary)" />}
                </button>
              ))}
            </div>

            <div className={styles.sheetSection}>
              <span className={styles.sheetSectionLabel}>Sort</span>
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={`${styles.dropdownRow} ${option.key === sortBy ? styles.dropdownRowActive : ''}`}
                  onClick={() => onSortByChange(option.key)}
                >
                  {option.label}
                  {option.key === sortBy && <Check size={14} color="var(--primary)" />}
                </button>
              ))}
            </div>

            <button type="button" className={styles.sheetDoneBtn} onClick={onClose}>
              Done
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
