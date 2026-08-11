'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { Calendar, Camera, CheckCircle2, Crown, Heart, Mail, Package, Phone, ShieldCheck, Sparkles, Wallet, X, XCircle } from 'lucide-react';
import type { PublicOffer } from '@freshcart/types';
import { supabase } from '../lib/supabase';
import { uploadAvatarImage, getPublicOffers, getOrderSummary, type OrderSummary } from '../lib/api';
import { useProfileSummaryStore, useWishlistStore } from '../lib/store';
import { formatPrice } from '../lib/formatPrice';
import { useToast } from './ToastProvider';
import { Avatar } from './Avatar';
import { AccountCard } from './AccountCard';
import { AccountButton } from './AccountButton';
import styles from './ProfileDetails.module.css';

interface ProfileRow {
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: string;
  created_at: string;
  avatar_url: string | null;
  is_vip: boolean | null;
}

// Flat, theme-independent brand green for the identity card — deliberately not
// var(--primary), which flips to orange in the dark storefront theme.
const IDENTITY_CARD_BG = '#059669';

// Boxed field: the .underlineField class in ProfileDetails.module.css supplies the
// focus-state border color (can't do :focus in an inline style object), this is the
// shared base for layout/typography.
const fieldStyle = {
  width: '100%',
  padding: '0.7rem 0.8rem',
  border: '1px solid var(--acc-field-border, var(--border-color))',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--layer-0)',
  color: 'var(--text-primary)',
  fontSize: '0.95rem',
};

export function ProfileDetails() {
  const { showToast } = useToast();
  const setProfileSummary = useProfileSummaryStore((s) => s.setProfileSummary);
  const wishlistCount = useWishlistStore((s) => s.items.length);

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [showVipBenefits, setShowVipBenefits] = useState(false);
  const [vipOffers, setVipOffers] = useState<PublicOffer[] | null>(null);
  const [orderSummary, setOrderSummary] = useState<OrderSummary>({ orderCount: 0, totalSpent: 0, inTransitCount: 0 });

  const handleOpenVipBenefits = async () => {
    setShowVipBenefits(true);
    if (vipOffers !== null) return;
    try {
      const offers = await getPublicOffers();
      setVipOffers(offers.filter((o) => o.target_segment === 'vip'));
    } catch {
      setVipOffers([]);
    }
  };

  const describeOffer = (offer: PublicOffer) => {
    if (offer.tiers && offer.tiers.length > 0) return `${offer.name} — tiered discount`;
    if (offer.discount_type === 'percentage') return `${offer.name} — ${offer.discount_value}% off`;
    if (offer.discount_type === 'flat') return `${offer.name} — ₹${offer.discount_value} off`;
    if (offer.discount_type === 'free_shipping') return `${offer.name} — free shipping`;
    if (offer.discount_type === 'gift_with_purchase') return `${offer.name} — free gift`;
    if (offer.discount_type === 'bogo') return `${offer.name} — buy one get one`;
    return offer.name;
  };

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setLoadError('');

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        setLoadError(userError?.message || 'Unable to load account.');
        setLoading(false);
        return;
      }

      setUser(userData.user);

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('email, full_name, phone, role, created_at, avatar_url, is_vip')
        .eq('id', userData.user.id)
        .maybeSingle();

      if (profileError) {
        setLoadError(profileError.message);
      }

      setProfile(data);
      setFullName(data?.full_name || String(userData.user.user_metadata?.full_name || ''));
      setAvatarUrl(data?.avatar_url || null);
      setProfileSummary({
        fullName: data?.full_name || String(userData.user.user_metadata?.full_name || ''),
        avatarUrl: data?.avatar_url || null,
      });
      setLoading(false);
    }

    loadProfile();
  }, [setProfileSummary]);

  // Order stats are independent of the profile fetch above — a failure here
  // should never block the rest of the page, it just leaves the zero-state.
  useEffect(() => {
    let cancelled = false;
    getOrderSummary()
      .then((summary) => {
        if (!cancelled) setOrderSummary(summary);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !user) return;

    setUploadingAvatar(true);
    try {
      const url = await uploadAvatarImage(file, user.id);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: url, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (updateError) throw updateError;

      setAvatarUrl(url);
      setProfileSummary({ avatarUrl: url });
      showToast('Profile photo updated', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to upload photo.', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    setSaving(true);

    const { data: savedProfile, error: updateError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email || null,
        full_name: fullName.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .select('email, full_name, phone, role, created_at, avatar_url, is_vip')
      .single();

    if (updateError) {
      showToast(updateError.message, 'error');
      setSaving(false);
      return;
    }

    await supabase.auth.updateUser({
      data: { full_name: fullName.trim() || null },
    });

    setProfile(savedProfile);
    setProfileSummary({ fullName: fullName.trim() });
    showToast('Profile saved successfully.', 'success');
    setSaving(false);
  };

  const email = profile?.email || user?.email || 'No email stored';
  const emailVerified = Boolean(user?.email_confirmed_at);
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString()
    : user?.created_at
      ? new Date(user.created_at).toLocaleDateString()
      : 'Not available';

  if (loading) {
    return <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Loading profile...</p>;
  }

  const statItems = [
    { label: 'Orders', value: String(orderSummary.orderCount), icon: Package },
    { label: 'Total Spent', value: formatPrice(orderSummary.totalSpent), icon: Wallet },
    { label: 'Wishlist', value: String(wishlistCount), icon: Heart },
  ];

  const accountDetailItems = [
    { label: 'Role', value: profile?.role || 'customer', icon: ShieldCheck },
    { label: 'Email Status', value: emailVerified ? 'Verified' : 'Not verified', icon: emailVerified ? CheckCircle2 : XCircle },
    { label: 'Phone', value: profile?.phone || 'Not linked', icon: Phone },
    { label: 'Member Since', value: memberSince, icon: Calendar },
  ];

  return (
    <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
      {loadError && <p style={{ margin: 0, color: '#B91C1C', fontSize: '0.88rem', fontWeight: 700 }}>{loadError}</p>}

      <div className={styles.stagger} style={{ display: 'grid', gap: '1.25rem' }}>
        {/* Identity summary: avatar/name/email/member-since, membership tier, and live stats — one card */}
        <AccountCard hoverable style={{ padding: 0, overflow: 'hidden', background: IDENTITY_CARD_BG }}>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div className={styles.avatarWrap} style={{ border: '3px solid rgba(255,255,255,0.5)', borderRadius: '50%' }}>
                  <Avatar name={fullName} email={email} avatarUrl={avatarUrl} size={72} />
                </div>
                <label
                  title="Change profile photo"
                  className={styles.cameraBadge}
                  style={{
                    position: 'absolute',
                    bottom: -2,
                    right: -2,
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: '#fff',
                    color: IDENTITY_CARD_BG,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `2px solid ${IDENTITY_CARD_BG}`,
                    cursor: uploadingAvatar ? 'wait' : 'pointer',
                  }}
                >
                  <Camera size={13} />
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingAvatar}
                    style={{ display: 'none' }}
                    onChange={handleAvatarChange}
                  />
                </label>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
                  {fullName || 'Add your name'}
                </p>
                <p style={{ margin: '0.25rem 0 0', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)', overflowWrap: 'anywhere' }}>
                  <Mail size={12} />
                  {uploadingAvatar ? 'Uploading photo...' : email}
                </p>
                <p style={{ margin: '0.3rem 0 0', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)' }}>
                  <Calendar size={12} /> Member since {memberSince}
                </p>
              </div>
            </div>

            {/* Membership tier */}
            <div style={{ marginTop: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.35rem 0.8rem',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  background: profile?.is_vip ? '#F59E0B' : 'rgba(255,255,255,0.16)',
                  color: '#fff',
                }}
              >
                <Crown size={14} fill={profile?.is_vip ? 'currentColor' : 'none'} />
                {profile?.is_vip ? 'VIP Member' : 'Standard Member'}
              </div>
              <button
                type="button"
                onClick={handleOpenVipBenefits}
                className={styles.vipLinkOnBrand}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                  background: 'transparent', border: 'none', color: '#fff',
                  cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', padding: 0,
                }}
              >
                <Sparkles size={13} /> See VIP benefits
              </button>
            </div>
          </div>

          {/* Stats row, sourced from real order + wishlist data */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.22)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
            {statItems.map((stat, i) => (
              <div
                key={stat.label}
                style={{
                  padding: '0.9rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.16)' : 'none',
                }}
              >
                <stat.icon size={16} color="rgba(255,255,255,0.85)" />
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#fff', overflowWrap: 'anywhere' }}>{stat.value}</p>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </AccountCard>

        {/* Edit Profile — only the fields that are actually editable here */}
        <form
          onSubmit={handleSave}
          style={{
            border: 'var(--acc-card-border, 1px solid var(--border-color))',
            borderRadius: 'var(--acc-card-radius, var(--radius-sm))',
            boxShadow: 'var(--acc-card-shadow, none)',
            background: 'var(--layer-0)',
            padding: 'var(--acc-card-padding, 1.5rem)',
            display: 'grid',
            gap: '1.1rem',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 'var(--acc-text-section-title-size, 1.05rem)', fontWeight: 700 }}>Edit Profile</h2>

          <label style={{ display: 'grid', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 700 }}>
            Full Name
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Enter your name"
              className={styles.underlineField}
              style={fieldStyle}
            />
          </label>

          <AccountButton type="submit" variant="primary" disabled={saving} style={{ justifySelf: 'start' }}>
            {saving ? 'Saving...' : 'Save changes'}
          </AccountButton>
        </form>

        {/* Account Details — read-only reference info, visually distinct from the editable card above */}
        <AccountCard hoverable accent="default-highlight" style={{ display: 'grid', gap: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: 'var(--acc-text-section-title-size, 1.05rem)', fontWeight: 700 }}>Account Details</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.5rem 1.25rem' }}>
            {accountDetailItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className={styles.infoItem} style={{ minWidth: 0 }}>
                  <p
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      margin: '0 0 0.3rem',
                      color: 'var(--text-secondary)',
                      fontSize: 'var(--acc-text-label-size, 0.72rem)',
                      fontWeight: 'var(--acc-text-label-weight, 700)',
                      textTransform: 'uppercase',
                      letterSpacing: 'var(--acc-text-label-tracking, 0.04em)',
                    }}
                  >
                    <Icon size={13} />
                    {item.label}
                  </p>
                  <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.92rem', fontWeight: 800, overflowWrap: 'anywhere' }}>{item.value}</p>
                </div>
              );
            })}
          </div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Email and phone are your sign-in identities — verify or change them from{' '}
            <Link href="/security" style={{ color: 'var(--primary)', fontWeight: 700 }}>Security</Link>.
          </p>
        </AccountCard>

        {showVipBenefits && (
          <div
            onClick={() => setShowVipBenefits(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', zIndex: 200 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ width: '100%', maxWidth: '24rem', maxHeight: '80vh', overflowY: 'auto', background: 'var(--layer-0)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Crown size={18} color="#F59E0B" /> VIP Benefits
                </h2>
                <button type="button" onClick={() => setShowVipBenefits(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  <X size={18} />
                </button>
              </div>
              {!profile?.is_vip && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 0 }}>
                  VIP status is granted by FreshCart — here&apos;s what&apos;s unlocked once you have it.
                </p>
              )}
              {vipOffers === null ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Loading…</p>
              ) : vipOffers.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>No VIP-exclusive offers are live right now — check back soon.</p>
              ) : (
                <ul style={{ margin: '0.75rem 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: '0.6rem' }}>
                  {vipOffers.map((offer) => (
                    <li key={offer.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                      <Sparkles size={14} color="#F59E0B" style={{ marginTop: 2, flexShrink: 0 }} />
                      <span>{describeOffer(offer)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
