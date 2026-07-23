'use client';

import { Search, X } from 'lucide-react';
import styles from './FilterBar.module.css';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchInput({ value, onChange }: SearchInputProps) {
  return (
    <div className={styles.searchBarWrap}>
      <Search size={15} className={styles.searchBarIcon} />
      <input
        type="text"
        className={styles.searchBarInput}
        placeholder="Search products..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Search products"
      />
      {value && (
        <button
          type="button"
          className={styles.searchBarClearBtn}
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
