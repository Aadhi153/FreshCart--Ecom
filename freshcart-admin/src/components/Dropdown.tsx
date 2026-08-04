import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  id?: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
}

// Shared custom-styled select, replacing native <select> (which renders with
// OS-native option-list styling that can't be themed) wherever the app needs
// a consistent accent-colored dropdown — e.g. Discount Type / Applicable Scope
// on the promotion forms.
export default function Dropdown({ id, value, options, onChange }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => options.findIndex(o => o.value === value));
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(Math.max(0, options.findIndex(o => o.value === value)));

    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, options, value]);

  const commit = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(options.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(0, i - 1));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      commit(activeIndex);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div className="dropdown-root" ref={rootRef}>
      <button
        type="button"
        id={id}
        className="dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        onKeyDown={handleKeyDown}
      >
        <span>{selected?.label ?? ''}</span>
        <ChevronDown size={15} className={`dropdown-chevron${open ? ' dropdown-chevron-open' : ''}`} />
      </button>
      {open && (
        <ul className="dropdown-panel" role="listbox">
          {options.map((option, index) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              className={`dropdown-option${option.value === value ? ' dropdown-option-selected' : ''}${index === activeIndex ? ' dropdown-option-active' : ''}`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => commit(index)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
