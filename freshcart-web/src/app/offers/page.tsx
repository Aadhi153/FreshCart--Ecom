'use client';

import { useEffect, useState } from 'react';
import { Tag, Truck, Gift, Percent, Copy } from 'lucide-react';
import type { PublicOffer } from '@freshcart/types';
import { getPublicOffers } from '../../lib/api';
import { formatOfferHeadline, formatOfferConditions } from '../../lib/promotionMath';
import { useToast } from '../../components/ToastProvider';
import styles from './page.module.css';

function offerIcon(offer: PublicOffer) {
  if (offer.discount_type === 'free_shipping') return <Truck size={18} />;
  if (offer.discount_type === 'bogo') return <Gift size={18} />;
  if (offer.discount_type === 'percentage') return <Percent size={18} />;
  return <Tag size={18} />;
}

export default function OffersPage() {
  const { showToast } = useToast();
  const [offers, setOffers] = useState<PublicOffer[] | null>(null);

  useEffect(() => {
    getPublicOffers().then(setOffers);
  }, []);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code).then(() => showToast(`Code "${code}" copied`, 'success'));
  };

  return (
    <main className={styles.main}>
      <h1 className={styles.heading}>Current Offers</h1>
      <p className={styles.subheading}>Every active discount, auto-applied deal, and coupon code available right now.</p>

      {offers === null ? (
        <div className={styles.grid}>
          {[0, 1, 2].map((i) => <div key={i} className={styles.skeletonCard} />)}
        </div>
      ) : offers.length === 0 ? (
        <div className={styles.empty}>No active offers right now — check back soon.</div>
      ) : (
        <div className={styles.grid}>
          {offers.map((offer) => {
            const conditions = formatOfferConditions(offer);
            return (
              <article key={offer.id} className={styles.card}>
                <div className={styles.cardHeadline}>
                  {offerIcon(offer)} {formatOfferHeadline(offer)}
                </div>
                <p className={styles.cardName}>{offer.name}</p>
                {offer.description && <p className={styles.cardDescription}>{offer.description}</p>}
                {conditions && <p className={styles.cardConditions}>{conditions}</p>}
                {offer.requires_code && offer.code ? (
                  <div className={styles.cardCode}>
                    <span>{offer.code}</span>
                    <button type="button" className={styles.cardCodeCopyBtn} onClick={() => handleCopy(offer.code!)}>
                      <Copy size={13} /> Copy
                    </button>
                  </div>
                ) : (
                  <span className={styles.cardAutoTag}>Auto-applied at checkout</span>
                )}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
