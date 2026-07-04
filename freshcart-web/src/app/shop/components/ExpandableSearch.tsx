'use client';

import { useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import styles from './FilterBar.module.css';

interface ExpandableSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function ExpandableSearch({ value, onChange }: ExpandableSearchProps) {
  const [isOpen, setIsOpen] = useState(value.length > 0);
  const inputRef = useRef<HTMLInputElement>(null);

  const openAndFocus = () => {
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div className={`${styles.searchWrap} ${isOpen ? styles.searchWrapOpen : ''}`}>
      <button
        type="button"
        className={styles.searchIconBtn}
        onClick={() => (isOpen ? inputRef.current?.focus() : openAndFocus())}
        aria-label="Search products"
      >
        <Search size={16} />
      </button>
      <input
        ref={inputRef}
        type="text"
        className={styles.searchInput}
        placeholder="Search products..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => { if (!value) setIsOpen(false); }}
      />
      {value && (
        <button
          type="button"
          className={styles.searchClearBtn}
          onClick={() => { onChange(''); inputRef.current?.focus(); }}
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
