import type { CSSProperties } from 'react';

export const statusColors: Record<string, CSSProperties> = {
  placed:     { background: 'color-mix(in srgb, var(--accent) 16%, transparent)',  color: 'var(--accent)' },
  packed:     { background: 'color-mix(in srgb, var(--warning) 16%, transparent)', color: 'var(--warning)' },
  shipped:    { background: 'color-mix(in srgb, var(--primary) 16%, transparent)', color: 'var(--primary)' },
  delivered:  { background: 'color-mix(in srgb, var(--success) 16%, transparent)', color: 'var(--success)' },
  cancelled:  { background: 'color-mix(in srgb, var(--danger) 16%, transparent)',  color: 'var(--danger)' },
};
