'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { motion } from 'framer-motion';
import styles from './AccountButton.module.css';

export type AccountButtonVariant = 'primary' | 'secondary' | 'danger' | 'danger-solid';

interface AccountButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'> {
  variant?: AccountButtonVariant;
  leftIcon?: ReactNode;
  compact?: boolean;
}

export function AccountButton({
  variant = 'secondary',
  leftIcon,
  compact = false,
  className,
  children,
  disabled,
  ...rest
}: AccountButtonProps) {
  const classes = [styles.button, styles[`variant-${variant}`], compact && styles.compact, className]
    .filter(Boolean)
    .join(' ');

  return (
    <motion.button
      type="button"
      className={classes}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      whileHover={disabled || variant !== 'primary' ? undefined : { y: -1, boxShadow: 'var(--acc-card-shadow-hover)' }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      {...rest}
    >
      {leftIcon}
      {children}
    </motion.button>
  );
}
