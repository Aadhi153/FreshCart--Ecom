import type { ReactNode } from 'react';

export function highlightMatch(text: string, term: string): ReactNode {
  const trimmed = term.trim();
  if (!trimmed) return text;

  const idx = text.toLowerCase().indexOf(trimmed.toLowerCase());
  if (idx === -1) return text;

  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'color-mix(in srgb, var(--primary) 24%, transparent)', color: 'inherit', borderRadius: 3, padding: '0 2px' }}>
        {text.slice(idx, idx + trimmed.length)}
      </mark>
      {text.slice(idx + trimmed.length)}
    </>
  );
}
