'use client';

import { useEffect, useState } from 'react';
import { Copy, Gift, MessageCircle, Sparkles, Tag, Users } from 'lucide-react';
import type { PublicOffer } from '@freshcart/types';
import { supabase } from '../lib/supabase';
import { getPublicOffers, getMyReferrals, type ReferralSummary } from '../lib/api';
import { useToast } from './ToastProvider';
import { AccountCard } from './AccountCard';
import { AccountButton } from './AccountButton';
import { EmptyState, Skeleton } from './Skeleton';

function describeOffer(offer: PublicOffer) {
  if (offer.tiers && offer.tiers.length > 0) return `${offer.name} — tiered discount`;
  if (offer.discount_type === 'percentage') return `${offer.name} — ${offer.discount_value}% off`;
  if (offer.discount_type === 'flat') return `${offer.name} — ₹${offer.discount_value} off`;
  if (offer.discount_type === 'free_shipping') return `${offer.name} — free shipping`;
  if (offer.discount_type === 'gift_with_purchase') return `${offer.name} — free gift`;
  if (offer.discount_type === 'bogo') return `${offer.name} — buy one get one`;
  return offer.name;
}

export function RewardsDetails() {
  const { showToast } = useToast();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [offers, setOffers] = useState<PublicOffer[] | null>(null);
  const [referrals, setReferrals] = useState<ReferralSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data } = await supabase
          .from('profiles')
          .select('referral_code')
          .eq('id', userData.user.id)
          .maybeSingle();
        setReferralCode(data?.referral_code || null);
      }

      const [offersResult, referralsResult] = await Promise.allSettled([
        getPublicOffers(),
        getMyReferrals(),
      ]);
      setOffers(offersResult.status === 'fulfilled' ? offersResult.value : []);
      setReferrals(referralsResult.status === 'fulfilled' ? referralsResult.value : { count: 0, referrals: [] });
      setLoading(false);
    }
    load();
  }, []);

  const handleCopy = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
      showToast('Referral code copied!', 'success');
    } catch {
      showToast('Could not copy — copy it manually.', 'error');
    }
  };

  const handleShareWhatsApp = () => {
    if (!referralCode) return;
    const link = `${window.location.origin}/auth?ref=${referralCode}`;
    const message = `Hey! Use my code ${referralCode} to get ₹50 off your first FreshCart order 🛒 ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div style={{ display: 'grid', gap: '0.9rem' }}>
        {[0, 1].map((i) => (
          <div key={i} style={{ display: 'grid', gap: '0.6rem', padding: '0.95rem', border: 'var(--acc-card-border, 1px solid var(--border-color))', borderRadius: 'var(--acc-card-radius, var(--radius-sm))' }}>
            <Skeleton style={{ width: '35%', height: '1rem' }} />
            <Skeleton style={{ width: '55%', height: '0.85rem' }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      {referralCode && (
        <AccountCard style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
            <Gift size={18} color="var(--accent)" />
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Your Referral Code</p>
              <p style={{ margin: '0.15rem 0 0', fontSize: '1rem', fontWeight: 800, letterSpacing: '0.04em', color: 'var(--text-primary)' }}>
                {referralCode}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            <AccountButton compact variant="secondary" onClick={handleCopy} title="Copy referral code" leftIcon={<Copy size={14} />}>
              Copy
            </AccountButton>
            <AccountButton
              compact
              variant="secondary"
              onClick={handleShareWhatsApp}
              title="Share via WhatsApp"
              leftIcon={<MessageCircle size={14} />}
              style={{ borderColor: '#25D366', background: '#25D366', color: '#fff' }}
            >
              Share
            </AccountButton>
          </div>
        </AccountCard>
      )}

      <AccountCard style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
        <Users size={18} color="var(--accent)" />
        <div>
          <p style={{ margin: 0, fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.05rem' }}>
            {referrals?.count ?? 0} {referrals?.count === 1 ? 'friend' : 'friends'} joined with your code
          </p>
          <p style={{ margin: '0.15rem 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Share your code above to invite more.
          </p>
        </div>
      </AccountCard>

      <section>
        <h2 style={{ margin: '0 0 0.75rem', fontSize: 'var(--acc-text-section-title-size, 1.05rem)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Tag size={17} /> Available Coupons & Offers
        </h2>
        {!offers || offers.length === 0 ? (
          <EmptyState
            icon={<Sparkles size={24} />}
            heading="No offers live right now"
            subtext="Check back soon for new coupons and deals."
          />
        ) : (
          <div style={{ display: 'grid', gap: '0.7rem' }}>
            {offers.map((offer) => (
              <AccountCard key={offer.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>{describeOffer(offer)}</p>
                  {offer.description && (
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{offer.description}</p>
                  )}
                </div>
                {offer.requires_code && offer.code && (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      padding: '0.35rem 0.8rem',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--primary-light)',
                      color: 'var(--accent)',
                      fontSize: '0.85rem',
                    }}
                  >
                    {offer.code}
                  </span>
                )}
              </AccountCard>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
