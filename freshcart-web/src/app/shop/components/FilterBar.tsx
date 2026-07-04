'use client';

import { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useClickOutside } from '../../../lib/useClickOutside';
import { PRICE_BUCKETS, SORT_OPTIONS, type PriceBucketKey, type SortKey } from '../filters';
import { ExpandableSearch } from './ExpandableSearch';
import { ActiveFilterChips, type FilterChip } from './ActiveFilterChips';
import { PriceDropdown } from './PriceDropdown';
import { SortDropdown } from './SortDropdown';
import { MobileFilterSheet } from './MobileFilterSheet';
import styles from './FilterBar.module.css';

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onClearCategory: () => void;
  priceBucket: PriceBucketKey;
  onPriceBucketChange: (value: PriceBucketKey) => void;
  sortBy: SortKey;
  onSortByChange: (value: SortKey) => void;
  onClearAll: () => void;
}

export function FilterBar({
  search,
  onSearchChange,
  selectedCategory,
  onClearCategory,
  priceBucket,
  onPriceBucketChange,
  sortBy,
  onSortByChange,
  onClearAll,
}: FilterBarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<'price' | 'sort' | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const priceRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useClickOutside([priceRef, sortRef], () => setOpenDropdown(null), openDropdown !== null);

  const chips: FilterChip[] = [];
  if (selectedCategory !== 'All') {
    chips.push({ key: 'category', label: selectedCategory, onRemove: onClearCategory });
  }
  if (priceBucket !== 'all') {
    const bucket = PRICE_BUCKETS.find((b) => b.key === priceBucket);
    if (bucket) chips.push({ key: 'price', label: bucket.label, onRemove: () => onPriceBucketChange('all') });
  }
  if (search.trim()) {
    chips.push({ key: 'search', label: `"${search.trim()}"`, onRemove: () => onSearchChange('') });
  }

  return (
    <div className={`${styles.filterBar} ${isScrolled ? styles.scrolled : ''}`}>
      <div className={styles.filterBarRow}>
        <ExpandableSearch value={search} onChange={onSearchChange} />

        <div className={styles.chipsSlot}>
          <ActiveFilterChips chips={chips} onClearAll={onClearAll} />
        </div>

        <div className={styles.desktopControls}>
          <PriceDropdown
            ref={priceRef}
            value={priceBucket}
            isOpen={openDropdown === 'price'}
            onToggle={() => setOpenDropdown((o) => (o === 'price' ? null : 'price'))}
            onChange={onPriceBucketChange}
          />
          <SortDropdown
            ref={sortRef}
            value={sortBy}
            isOpen={openDropdown === 'sort'}
            onToggle={() => setOpenDropdown((o) => (o === 'sort' ? null : 'sort'))}
            onChange={onSortByChange}
          />
        </div>

        <button
          type="button"
          className={styles.mobileFilterBtn}
          onClick={() => setMobileSheetOpen(true)}
          aria-label="Open filters"
        >
          <SlidersHorizontal size={16} />
          Filter
        </button>
      </div>

      <MobileFilterSheet
        isOpen={mobileSheetOpen}
        onClose={() => setMobileSheetOpen(false)}
        priceBucket={priceBucket}
        onPriceBucketChange={onPriceBucketChange}
        sortBy={sortBy}
        onSortByChange={onSortByChange}
      />
    </div>
  );
}
