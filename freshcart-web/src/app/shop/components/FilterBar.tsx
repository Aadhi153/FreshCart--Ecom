'use client';

import { useEffect, useRef, useState } from 'react';
import { useClickOutside } from '../../../lib/useClickOutside';
import type { SortKey } from '../filters';
import { SearchInput } from './SearchInput';
import { ActiveFilterChips, type FilterChip } from './ActiveFilterChips';
import { SortDropdown } from './SortDropdown';
import styles from './FilterBar.module.css';

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  chips: FilterChip[];
  onClearAll: () => void;
  sortBy: SortKey;
  onSortByChange: (value: SortKey) => void;
}

export function FilterBar({
  search,
  onSearchChange,
  chips,
  onClearAll,
  sortBy,
  onSortByChange,
}: FilterBarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useClickOutside([sortRef], () => setSortOpen(false), sortOpen);

  return (
    <div className={`${styles.filterBar} ${isScrolled ? styles.scrolled : ''}`}>
      <div className={styles.filterBarRow}>
        <SearchInput value={search} onChange={onSearchChange} />

        <div className={styles.chipsSlot}>
          <ActiveFilterChips chips={chips} onClearAll={onClearAll} />
        </div>

        <div className={styles.desktopControls}>
          <SortDropdown
            ref={sortRef}
            value={sortBy}
            isOpen={sortOpen}
            onToggle={() => setSortOpen((o) => !o)}
            onChange={onSortByChange}
          />
        </div>
      </div>
    </div>
  );
}
