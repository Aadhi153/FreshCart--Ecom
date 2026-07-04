'use client';

import Image from 'next/image';
import { useState, type CSSProperties } from 'react';
import { ShoppingBag } from 'lucide-react';
import styles from './ProductImage.module.css';

interface ProductImageProps {
  src?: string | null;
  alt: string;
  sizes: string;
  className?: string;
  imageStyle?: CSSProperties;
  iconSize?: number;
  showLabel?: boolean;
}

// Seed/demo product images point at third-party placeholder services (e.g. loremflickr)
// that occasionally fail to serve a given photo — fall back to a plain icon tile
// instead of letting the browser's broken-image glyph show through.
export function ProductImage({ src, alt, sizes, className, imageStyle, iconSize = 26, showLabel = false }: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={styles.fallback} aria-hidden="true">
        <ShoppingBag size={iconSize} />
        {showLabel && <span className={styles.fallbackLabel}>No image available</span>}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      style={imageStyle}
      onError={() => setFailed(true)}
    />
  );
}
