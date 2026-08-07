'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Clock,
  Copy,
  Gift,
  History,
  IndianRupee,
  MessageCircle,
  Percent,
  Sparkles,
  Tag,
  Truck,
  Users,
} from 'lucide-react';
import type { PublicOffer } from '@freshcart/types';
import { supabase } from '../lib/supabase';
import {
  getPublicOffers,
  getPromotionTeasers,
  getMyReferrals,
  type ReferralSummary,
  type ReferralRewardTier,
  type PromotionTeaser,
} from '../lib/api';
import { formatOfferHeadline, formatOfferConditions } from '../lib/promotionMath';
import { useToast } from './ToastProvider';
import { EmptyState, Skeleton } from './Skeleton';
import styles from './RewardsDetails.module.css';

function offerIcon(offer: PublicOffer) {
  if (offer.discount_type === 'free_shipping') return <Truck size={17} />;
  if (offer.discount_type === 'bogo' || offer.discount_type === 'gift_with_purchase') return <Gift size={17} />;
  if (offer.discount_type === 'percentage') return <Percent size={17} />;
  return <Tag size={17} />;
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

function nextRewardTier(tiers: ReferralRewardTier[], count: number): ReferralRewardTier | null {
  if (tiers.length === 0) return null;
  const sorted = [...tiers].sort((a, b) => a.referral_count - b.referral_count);
  return sorted.find((t) => t.referral_count > count) ?? null;
}

export function RewardsDetails() {
  const { showToast } = useToast();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [offers, setOffers] = useState<PublicOffer[] | null>(null);
  const [teasers, setTeasers] = useState<PromotionTeaser[] | null>(null);
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

      const [offersResult, teasersResult, referralsResult] = await Promise.allSettled([
        getPublicOffers(),
        getPromotionTeasers(),
        getMyReferrals(),
      ]);
      setOffers(offersResult.status === 'fulfilled' ? offersResult.value : []);
      setTeasers(teasersResult.status === 'fulfilled' ? teasersResult.value : []);
      setReferrals(
        referralsResult.status === 'fulfilled'
          ? referralsResult.value
          : { count: 0, referrals: [], totalEarned: 0, config: null }
      );
      setLoading(false);
    }
    load();
  }, []);

  const config = referrals?.config ?? null;
  const referrerAmount = config?.referrerRewardAmount ?? 0;
  const referredAmount = config?.referredRewardAmount ?? 0;
  const hasIncentive = referrerAmount > 0 || referredAmount > 0;
  const count = referrals?.count ?? 0;
  const tier = nextRewardTier(config?.tiers ?? [], count);
  const allTiersUnlocked = !!config?.tiers?.length && !tier;

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
    const message =
      referredAmount > 0
        ? `Hey! Use my code ${referralCode} to get ₹${referredAmount} off your first FreshCart order 🛒 ${link}`
        : `Hey! Use my code ${referralCode} on FreshCart and shop fresh groceries 🛒 ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  const handleCopyOfferCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => showToast(`Code "${code}" copied`, 'success'));
  };

  if (loading) {
    return (
      <div style={{ display: 'grid', gap: '1.25rem' }}>
        <Skeleton style={{ width: '100%', height: '11rem', borderRadius: 'var(--acc-card-radius, 16px)' }} />
        <div style={{ display: 'grid', gap: '0.6rem' }}>
          <Skeleton style={{ width: '35%', height: '1rem' }} />
          <Skeleton style={{ width: '100%', height: '6rem', borderRadius: 'var(--acc-card-radius, 16px)' }} />
        </div>
      </div>
    );
  }

  const hasOffers = !!offers && offers.length > 0;
  const hasTeasers = !!teasers && teasers.length > 0;

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      {referralCode && (
        <div className={styles.banner}>
          <div className={styles.bannerIncentiveRow}>
            <Gift size={22} />
            <div>
              <p className={styles.bannerIncentive}>
                {hasIncentive
                  ? referrerAmount > 0 && referredAmount > 0
                    ? `Give ₹${referrerAmount}, get ₹${referredAmount}`
                    : referrerAmount > 0
                      ? `Earn ₹${referrerAmount} for every friend who joins`
                      : `Your friends get ₹${referredAmount} off with your code`
                  : 'Invite your friends to FreshCart'}
              </p>
              {!hasIncentive && (
                <p className={styles.bannerSubtext}>Referral rewards aren&apos;t configured yet — check back soon.</p>
              )}
            </div>
          </div>

          <div className={styles.bannerCodeRow}>
            <span className={styles.bannerCode}>{referralCode}</span>
            <div className={styles.bannerActions}>
              <button type="button" className={styles.bannerActionBtn} onClick={handleCopy} title="Copy referral code">
                <Copy size={14} /> Copy
              </button>
              <button type="button" className={styles.bannerActionBtn} onClick={handleShareWhatsApp} title="Share via WhatsApp">
                <MessageCircle size={14} /> Share
              </button>
            </div>
          </div>

          <div className={styles.bannerStatsRow}>
            <div className={styles.statItem}>
              <Users size={18} />
              <span>
                <span className={styles.statValue}>{count}</span>
                <span className={styles.statLabel}>{count === 1 ? 'friend invited' : 'friends invited'}</span>
              </span>
            </div>
            <div className={styles.statItem}>
              <IndianRupee size={18} />
              <span>
                <span className={styles.statValue}>₹{referrals?.totalEarned ?? 0}</span>
                <span className={styles.statLabel}>earned from referrals</span>
              </span>
            </div>
          </div>

          {config?.tiers && config.tiers.length > 0 && (
            <div className={styles.bannerProgress}>
              <div className={styles.progressLabelRow}>
                <span>{allTiersUnlocked ? 'All reward tiers unlocked 🎉' : `Next reward at ${tier!.referral_count} referrals`}</span>
                <span>{count}/{tier ? tier.referral_count : config.tiers[config.tiers.length - 1].referral_count}</span>
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: `${Math.min(100, (count / (tier ? tier.referral_count : config.tiers[config.tiers.length - 1].referral_count)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <section>
        <h2 className={styles.sectionTitle}>
          <Tag size={17} /> Available Coupons &amp; Offers
        </h2>
        {!hasOffers && !hasTeasers ? (
          <EmptyState
            icon={<Sparkles size={24} />}
            heading="No offers live right now"
            subtext="Check back soon for new coupons and deals."
          />
        ) : (
          <div className={styles.offersGrid}>
            {offers!.map((offer) => {
              const conditions = formatOfferConditions(offer);
              return (
                <article key={offer.id} className={styles.offerCard}>
                  <div className={styles.offerHeadline}>
                    {offerIcon(offer)} {formatOfferHeadline(offer)}
                  </div>
                  <p className={styles.offerName}>{offer.name}</p>
                  {conditions && <p className={styles.offerConditions}>{conditions}</p>}
                  {offer.requires_code && offer.code ? (
                    <div className={styles.offerCodeRow}>
                      <span>{offer.code}</span>
                      <button type="button" className={styles.offerCopyBtn} onClick={() => handleCopyOfferCode(offer.code!)}>
                        <Copy size={13} /> Copy
                      </button>
                    </div>
                  ) : (
                    <Link href="/shop" className={styles.offerApplyLink}>
                      Apply <ArrowRight size={13} />
                    </Link>
                  )}
                </article>
              );
            })}

            {teasers!.map((teaser) => (
              <article key={teaser.id} className={styles.teaserCard}>
                <div className={styles.teaserTop}>
                  {teaser.status === 'upcoming' ? <Clock size={17} /> : <History size={17} />}
                </div>
                <p className={styles.teaserName}>{teaser.name}</p>
                <span className={styles.teaserStatus}>
                  {teaser.status === 'upcoming'
                    ? `Starts ${formatShortDate(teaser.valid_from)}`
                    : `Ended ${formatShortDate(teaser.valid_until ?? teaser.valid_from)}`}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
