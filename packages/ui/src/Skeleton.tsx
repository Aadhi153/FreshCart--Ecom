import type { CSSProperties } from 'react';

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: string;
  className?: string;
  style?: CSSProperties;
}

export function Skeleton({ width = '100%', height = 14, radius, className, style }: SkeletonProps) {
  const classes = ['fc-skeleton', className].filter(Boolean).join(' ');
  return (
    <div
      className={classes}
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}
