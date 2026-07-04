import type { ReactNode } from 'react';
import Link from 'next/link';
import styles from './Skeleton.module.css';

export function Skeleton({ style, className }: { style?: React.CSSProperties; className?: string }) {
  return <div className={`${styles.skeleton} ${className || ''}`} style={style} />;
}

export function CartItemSkeleton() {
  return (
    <div className={styles.cartItemSkeleton}>
      <div className={styles.cartItemSkeletonInfo}>
        <Skeleton style={{ width: '55%', height: '1rem' }} />
        <Skeleton style={{ width: '25%', height: '0.9rem' }} />
      </div>
      <Skeleton style={{ width: 110, height: '2.2rem' }} />
    </div>
  );
}

interface EmptyStateProps {
  icon: ReactNode;
  heading: string;
  subtext?: string;
  ctaHref?: string;
  ctaLabel?: string;
  ctaOnClick?: () => void;
}

export function EmptyState({ icon, heading, subtext, ctaHref, ctaLabel, ctaOnClick }: EmptyStateProps) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyStateIcon}>{icon}</div>
      <h3 className={styles.emptyStateHeading}>{heading}</h3>
      {subtext && <p className={styles.emptyStateSubtext}>{subtext}</p>}
      {ctaLabel && ctaHref && (
        <Link href={ctaHref} className={styles.emptyStateCta}>{ctaLabel}</Link>
      )}
      {ctaLabel && ctaOnClick && !ctaHref && (
        <button type="button" onClick={ctaOnClick} className={styles.emptyStateCta} style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}>
          {ctaLabel}
        </button>
      )}
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className={styles.cardSkeleton}>
      <Skeleton className={styles.image} />
      <div className={styles.body}>
        <Skeleton style={{ width: '40%', height: '0.7rem' }} />
        <Skeleton style={{ width: '80%', height: '1.1rem' }} />
        <Skeleton style={{ width: '50%', height: '1.3rem' }} />
      </div>
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className={styles.detailSkeleton}>
      <Skeleton className={styles.detailImage} />
      <div className={styles.detailInfo}>
        <Skeleton style={{ width: '30%', height: '0.8rem' }} />
        <Skeleton style={{ width: '70%', height: '2rem' }} />
        <Skeleton style={{ width: '40%', height: '1.5rem' }} />
        <Skeleton style={{ width: '100%', height: '4rem' }} />
        <Skeleton style={{ width: '100%', height: '3rem' }} />
      </div>
    </div>
  );
}
