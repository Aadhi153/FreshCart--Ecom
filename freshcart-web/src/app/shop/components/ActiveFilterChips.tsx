'use client';

import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import styles from './FilterBar.module.css';

export interface FilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

interface ActiveFilterChipsProps {
  chips: FilterChip[];
  onClearAll: () => void;
}

export function ActiveFilterChips({ chips, onClearAll }: ActiveFilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className={styles.chipRow}>
      <AnimatePresence initial={false}>
        {chips.map((chip) => (
          <motion.span
            key={chip.key}
            layout
            initial={{ opacity: 0, x: -8, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.18 }}
            className={styles.chip}
          >
            {chip.label}
            <button type="button" onClick={chip.onRemove} aria-label={`Remove ${chip.label} filter`} className={styles.chipRemoveBtn}>
              <X size={11} />
            </button>
          </motion.span>
        ))}
        <motion.button
          key="clear-all"
          layout
          type="button"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.18 }}
          className={styles.chipClearAll}
          onClick={onClearAll}
        >
          Clear all
        </motion.button>
      </AnimatePresence>
    </div>
  );
}
