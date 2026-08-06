import Image from 'next/image';
import styles from './AccountThumbnail.module.css';

interface AccountThumbnailProps {
  src?: string | null;
  alt: string;
  size?: number;
}

export function AccountThumbnail({ src, alt, size }: AccountThumbnailProps) {
  const style = size ? { width: size, height: size } : undefined;
  return (
    <div className={styles.thumb} style={style}>
      {src && <Image src={src} alt={alt} fill sizes={size ? `${size}px` : '64px'} style={{ objectFit: 'cover' }} />}
    </div>
  );
}
