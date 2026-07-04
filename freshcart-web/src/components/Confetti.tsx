'use client';

import { useMemo } from 'react';
import styles from './Confetti.module.css';

const COLORS = ['#059669', '#0891B2', '#F59E0B', '#EF4444', '#4ADE80', '#A78BFA'];
const PIECE_COUNT = 60;

interface Piece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  rotate: number;
  drift: number;
  isCircle: boolean;
}

export function Confetti({ active }: { active: boolean }) {
  const pieces: Piece[] = useMemo(() => {
    if (!active) return [];
    return Array.from({ length: PIECE_COUNT }, (_, id) => ({
      id,
      left: Math.random() * 100,
      delay: Math.random() * 0.4,
      duration: 2.6 + Math.random() * 1.6,
      color: COLORS[id % COLORS.length],
      rotate: Math.random() * 360,
      drift: (Math.random() - 0.5) * 120,
      isCircle: Math.random() > 0.5,
    }));
  }, [active]);

  if (!active) return null;

  return (
    <div className={styles.container} aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className={`${styles.piece} ${p.isCircle ? styles.circle : styles.rect}`}
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            backgroundColor: p.color,
            '--rotate': `${p.rotate}deg`,
            '--drift': `${p.drift}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
