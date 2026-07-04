import type { CSSProperties } from 'react';

export const statusColors: Record<string, CSSProperties> = {
  placed:     { background: 'rgba(251,191,36,0.15)',  color: '#FBBF24' },
  packed:     { background: 'rgba(251,146,60,0.15)',  color: '#FB923C' },
  shipped:    { background: 'rgba(56,189,248,0.15)',  color: '#38BDF8' },
  delivered:  { background: 'rgba(74,222,128,0.15)',  color: '#4ADE80' },
  cancelled:  { background: 'rgba(248,113,113,0.15)', color: '#F87171' },
};
