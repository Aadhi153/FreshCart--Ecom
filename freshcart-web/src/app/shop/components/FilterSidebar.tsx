'use client';

import type { ReactNode } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useClickOutside } from '../../../lib/useClickOutside';
import { useRef, useState } from 'react';
import { PRICE_BUCKETS, type PriceBucketKey, type DietaryFilters } from '../filters';
import styles from './FilterSidebar.module.css';

// Above this many categories, a raw checklist gets hard to scan, so a small filter-the-filters
// search box is added.
const CATEGORY_SEARCH_THRESHOLD = 15;

interface FilterSidebarProps {
  categories: string[];
  categoryCounts: Record<string, number>;
  selectedCategories: string[];
  onToggleCategory: (category: string) => void;
  priceBucket: PriceBucketKey;
  priceBucketCounts: Record<PriceBucketKey, number>;
  onPriceBucketChange: (value: PriceBucketKey) => void;
  inStockOnly: boolean;
  onInStockOnlyChange: (value: boolean) => void;
  dietary: DietaryFilters;
  onDietaryChange: (key: keyof DietaryFilters, value: boolean) => void;
  onSaleOnly: boolean;
  onOnSaleOnlyChange: (value: boolean) => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  onClearAll: () => void;
  mobileOpen: boolean;
  onMobileOpen: () => void;
  onMobileClose: () => void;
}

export function FilterSidebar({
  categories,
  categoryCounts,
  selectedCategories,
  onToggleCategory,
  priceBucket,
  priceBucketCounts,
  onPriceBucketChange,
  inStockOnly,
  onInStockOnlyChange,
  dietary,
  onDietaryChange,
  onSaleOnly,
  onOnSaleOnlyChange,
  hasActiveFilters,
  activeFilterCount,
  onClearAll,
  mobileOpen,
  onMobileOpen,
  onMobileClose,
}: FilterSidebarProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  useClickOutside([drawerRef], onMobileClose, mobileOpen);

  const [categorySearch, setCategorySearch] = useState('');

  const categoryList = categories.filter((c) => c !== 'All');
  const showCategorySearch = categoryList.length > CATEGORY_SEARCH_THRESHOLD;
  const visibleCategories = showCategorySearch
    ? categoryList.filter((c) => c.toLowerCase().includes(categorySearch.trim().toLowerCase()))
    : categoryList;

  const sections: ReactNode = (
    <>
      <div className={styles.section}>
        <span className={styles.sectionLabel}>Category</span>
        {showCategorySearch && (
          <div className={styles.categorySearchWrap}>
            <Search size={13} className={styles.categorySearchIcon} />
            <input
              type="text"
              className={styles.categorySearchInput}
              placeholder="Search categories..."
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
            />
          </div>
        )}
        {visibleCategories.map((category) => (
          <label key={category} className={styles.optionRow}>
            <input
              type="checkbox"
              checked={selectedCategories.includes(category)}
              onChange={() => onToggleCategory(category)}
            />
            <span className={styles.optionLabel}>{category}</span>
            <span className={styles.optionCount}>{categoryCounts[category] ?? 0}</span>
          </label>
        ))}
        {visibleCategories.length === 0 && (
          <p className={styles.noMatches}>No categories match &quot;{categorySearch}&quot;</p>
        )}
      </div>

      <div className={styles.section}>
        <span className={styles.sectionLabel}>Price</span>
        {PRICE_BUCKETS.map((bucket) => (
          <label key={bucket.key} className={styles.optionRow}>
            <input
              type="radio"
              name="priceBucket"
              checked={priceBucket === bucket.key}
              onChange={() => onPriceBucketChange(bucket.key)}
            />
            <span className={styles.optionLabel}>{bucket.label}</span>
            <span className={styles.optionCount}>{priceBucketCounts[bucket.key] ?? 0}</span>
          </label>
        ))}
      </div>

      <div className={styles.section}>
        <span className={styles.sectionLabel}>Availability</span>
        <label className={styles.optionRow}>
          <input type="checkbox" checked={inStockOnly} onChange={(e) => onInStockOnlyChange(e.target.checked)} />
          In stock only
        </label>
      </div>

      <div className={styles.section}>
        <span className={styles.sectionLabel}>Dietary</span>
        <label className={styles.optionRow}>
          <input type="checkbox" checked={dietary.vegetarian} onChange={(e) => onDietaryChange('vegetarian', e.target.checked)} />
          Vegetarian
        </label>
        <label className={styles.optionRow}>
          <input type="checkbox" checked={dietary.vegan} onChange={(e) => onDietaryChange('vegan', e.target.checked)} />
          Vegan
        </label>
        <label className={styles.optionRow}>
          <input type="checkbox" checked={dietary.organic} onChange={(e) => onDietaryChange('organic', e.target.checked)} />
          Organic
        </label>
      </div>

      <div className={styles.section}>
        <span className={styles.sectionLabel}>Offers</span>
        <label className={styles.optionRow}>
          <input type="checkbox" checked={onSaleOnly} onChange={(e) => onOnSaleOnlyChange(e.target.checked)} />
          On sale
        </label>
      </div>
    </>
  );

  return (
    <>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2>Filters</h2>
          {hasActiveFilters && (
            <button type="button" className={styles.clearAllBtn} onClick={onClearAll}>
              Clear all
            </button>
          )}
        </div>
        {activeFilterCount > 0 && (
          <div className={styles.filterCountRow}>
            <span className={styles.filterCountBadge}>{activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'} applied</span>
          </div>
        )}
        {sections}
      </aside>

      <button type="button" className={styles.mobileTrigger} onClick={onMobileOpen}>
        <SlidersHorizontal size={16} />
        Filters
        {activeFilterCount > 0 && <span className={styles.mobileTriggerBadge}>{activeFilterCount}</span>}
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className={styles.drawerBackdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              ref={drawerRef}
              className={styles.drawer}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className={styles.drawerHeader}>
                <h2>Filters</h2>
                <button type="button" onClick={onMobileClose} aria-label="Close filters" className={styles.drawerCloseBtn}>
                  <X size={18} />
                </button>
              </div>
              {activeFilterCount > 0 && (
                <div className={styles.filterCountRow}>
                  <span className={styles.filterCountBadge}>{activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'} applied</span>
                  <button type="button" className={styles.clearAllBtn} onClick={onClearAll}>
                    Clear all
                  </button>
                </div>
              )}
              {sections}
              <button type="button" className={styles.drawerDoneBtn} onClick={onMobileClose}>
                Done
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
