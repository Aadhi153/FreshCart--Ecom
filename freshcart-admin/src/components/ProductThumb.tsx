import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Package } from 'lucide-react';

interface ProductThumbProps {
  src?: string | null;
  alt: string;
  size: number;
  style?: CSSProperties;
}

// A broken/missing product image URL is routine in an admin that's fed by
// user-entered URLs (stale links, deleted storage objects) — without this,
// the browser renders its native broken-image glyph with the alt text
// spilling out next to it, wrecking row alignment in every table that
// shows a thumbnail.
export function ProductThumb({ src, alt, size, style }: ProductThumbProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return (
      <div
        style={{
          width: size, height: size, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--layer-1)', border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          ...style,
        }}
      >
        <Package size={Math.round(size * 0.45)} style={{ color: 'var(--text-muted)' }} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      style={{
        width: size, height: size, flexShrink: 0,
        objectFit: 'cover', borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-color)',
        ...style,
      }}
    />
  );
}
