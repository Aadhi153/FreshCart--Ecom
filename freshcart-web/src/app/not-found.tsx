import Link from 'next/link';
import { Compass } from 'lucide-react';
import styles from './status.module.css';

export default function NotFound() {
  return (
    <main className={styles.wrap}>
      <Compass size={40} color="var(--primary)" />
      <span className={styles.code}>404</span>
      <h1 className={styles.title}>This page wandered off</h1>
      <p className={styles.description}>
        We couldn&apos;t find the page you were looking for. It may have been moved or the link might be outdated.
      </p>
      <div className={styles.actions}>
        <Link href="/" className={styles.button}>Back to home</Link>
        <Link href="/shop" className={styles.buttonSecondary}>Browse the shop</Link>
      </div>
    </main>
  );
}
