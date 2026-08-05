'use client';

import type { HTMLAttributes, ReactNode } from 'react';
import { motion } from 'framer-motion';
import styles from './AccountCard.module.css';

interface AccountCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'> {
  children: ReactNode;
  hoverable?: boolean;
  accent?: 'default' | 'vip' | 'danger' | 'default-highlight';
}

export function AccountCard({
  children,
  hoverable = false,
  accent = 'default',
  className,
  ...rest
}: AccountCardProps) {
  const classes = [
    styles.card,
    accent === 'vip' && styles.cardVip,
    accent === 'danger' && styles.cardDanger,
    accent === 'default-highlight' && styles.cardHighlight,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <motion.div
      className={classes}
      // Flat design has no shadow to "pop" on hover, so the affordance is a subtle
      // border darkening instead of elevation — matches the reference's restraint.
      whileHover={hoverable ? { borderColor: 'rgba(15,23,42,0.18)' } : undefined}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
