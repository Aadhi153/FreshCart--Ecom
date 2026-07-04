import React from 'react';
import styles from '../page.module.css';

export default function AboutPage() {
  return (
    <main style={{ padding: '2rem', minHeight: 'calc(100vh - 64px)' }}>
      <section className={styles.aboutSection} style={{ marginTop: '2rem' }}>
        <div className={styles.aboutCopy}>
          <div className={styles.sectionHeaderLeft}>
            <span>About Us</span>
            <h2 className={styles.sectionTitle}>Built for fresh everyday shopping.</h2>
          </div>
          <p>
            FreshCart brings local produce, snacks, pantry essentials, and daily household picks into one fast storefront.
            We focus on clear availability, careful packing, and quick delivery so grocery runs take less time.
          </p>
        </div>
        <div className={styles.aboutStats}>
          <div>
            <strong>Local</strong>
            <span>Nearby sourcing and inventory</span>
          </div>
          <div>
            <strong>Fresh</strong>
            <span>Quality checks before dispatch</span>
          </div>
          <div>
            <strong>Fast</strong>
            <span>Designed for daily repeat orders</span>
          </div>
        </div>
      </section>
    </main>
  );
}
