'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import styles from './status.module.css';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className={styles.wrap}>
      <AlertTriangle size={40} color="var(--primary)" />
      <span className={styles.code}>Something went wrong</span>
      <h1 className={styles.title}>That didn&apos;t go as planned</h1>
      <p className={styles.description}>
        An unexpected error occurred while loading this page. You can try again, or head back to the homepage.
      </p>
      <div className={styles.actions}>
        <button onClick={reset} className={styles.button}>Try again</button>
        <Link href="/" className={styles.buttonSecondary}>Back to home</Link>
      </div>
    </main>
  );
}
