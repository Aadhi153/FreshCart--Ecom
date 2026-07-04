import React from 'react';
import styles from '../page.module.css';
import { Mail, Phone, MapPin, Clock3, ShieldCheck, Truck } from 'lucide-react';

export default function ContactPage() {
  return (
    <main style={{ padding: '2rem', minHeight: 'calc(100vh - 64px)' }}>
      <section className={styles.contactSection}>
        <div className={styles.sectionHeader}>
          <span>Contact Us</span>
          <h2 className={styles.sectionTitle}>Need help with an order?</h2>
        </div>
        <div className={styles.contactGrid}>
          <a href="mailto:support@freshcart.local" className={styles.contactItem}>
            <Mail size={22} />
            <div>
              <strong>Email</strong>
              <span>support@freshcart.local</span>
            </div>
          </a>
          <a href="tel:+910000000000" className={styles.contactItem}>
            <Phone size={22} />
            <div>
              <strong>Phone</strong>
              <span>+91 00000 00000</span>
            </div>
          </a>
          <div className={styles.contactItem}>
            <MapPin size={22} />
            <div>
              <strong>Service Area</strong>
              <span>Local grocery delivery</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.promiseSection} aria-label="FreshCart promises">
        <div className={styles.promiseItem}>
          <Clock3 size={22} />
          <div>
            <strong>Fast dispatch</strong>
            <span>Packed and routed quickly for daily orders.</span>
          </div>
        </div>
        <div className={styles.promiseItem}>
          <ShieldCheck size={22} />
          <div>
            <strong>Quality checked</strong>
            <span>Freshness checks before every delivery.</span>
          </div>
        </div>
        <div className={styles.promiseItem}>
          <Truck size={22} />
          <div>
            <strong>Local delivery</strong>
            <span>Essentials delivered from nearby inventory.</span>
          </div>
        </div>
      </section>
    </main>
  );
}
