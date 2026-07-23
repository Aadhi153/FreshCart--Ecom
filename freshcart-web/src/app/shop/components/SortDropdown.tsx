'use client';

import { forwardRef } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { SORT_OPTIONS, type SortKey } from '../filters';
import styles from './FilterBar.module.css';

interface SortDropdownProps {
  value: SortKey;
  isOpen: boolean;
  onToggle: () => void;
  onChange: (value: SortKey) => void;
}

export const SortDropdown = forwardRef<HTMLDivElement, SortDropdownProps>(function SortDropdown(
  { value, isOpen, onToggle, onChange },
  ref,
) {
  const selected = SORT_OPTIONS.find((s) => s.key === value) ?? SORT_OPTIONS[0];

  return (
    <div className={styles.dropdownContainer} ref={ref}>
      <button type="button" className={styles.dropdownTrigger} onClick={onToggle}>
        Sort: {selected.label}
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
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                className={`${styles.dropdownRow} ${option.key === value ? styles.dropdownRowActive : ''}`}
                onClick={() => { onChange(option.key); onToggle(); }}
              >
                <span className={styles.dropdownRowLabel}>{option.label}</span>
                {option.key === value && <Check size={14} color="var(--primary)" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
