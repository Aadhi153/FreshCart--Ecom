import Image from 'next/image';
import styles from './AccountThumbnail.module.css';

interface AccountThumbnailProps {
  src?: string | null;
  alt: string;
}

export function AccountThumbnail({ src, alt }: AccountThumbnailProps) {
  return (
    <div className={styles.thumb}>
      {src && <Image src={src} alt={alt} fill sizes="64px" style={{ objectFit: 'cover' }} />}
    </div>
  );
}
