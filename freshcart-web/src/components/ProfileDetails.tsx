'use client';

import { useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Calendar, Camera, CheckCircle2, Crown, Mail, Phone, ShieldCheck, Sparkles, X, XCircle } from 'lucide-react';
import type { PublicOffer } from '@freshcart/types';
import { supabase } from '../lib/supabase';
import { uploadAvatarImage, getPublicOffers } from '../lib/api';
import { useProfileSummaryStore } from '../lib/store';
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
  preferred_payment: string | null;
  is_vip: boolean | null;
}

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

const PAYMENT_OPTIONS = [
  { value: 'cod', label: 'Cash on Delivery' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Credit / Debit Card' },
  { value: 'netbanking', label: 'Net Banking' },
];

export function ProfileDetails() {
  const { showToast } = useToast();
  const setProfileSummary = useProfileSummaryStore((s) => s.setProfileSummary);

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [preferredPayment, setPreferredPayment] = useState('cod');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [showVipBenefits, setShowVipBenefits] = useState(false);
  const [vipOffers, setVipOffers] = useState<PublicOffer[] | null>(null);

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
        .select('email, full_name, phone, role, created_at, avatar_url, preferred_payment, is_vip')
        .eq('id', userData.user.id)
        .maybeSingle();

      if (profileError) {
        setLoadError(profileError.message);
      }

      setProfile(data);
      setFullName(data?.full_name || String(userData.user.user_metadata?.full_name || ''));
      setPhone(data?.phone || userData.user.phone || '');
      setAvatarUrl(data?.avatar_url || null);
      setPreferredPayment(data?.preferred_payment || 'cod');
      setProfileSummary({
        fullName: data?.full_name || String(userData.user.user_metadata?.full_name || ''),
        avatarUrl: data?.avatar_url || null,
      });
      setLoading(false);
    }

    loadProfile();
  }, [setProfileSummary]);

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
        preferred_payment: preferredPayment,
        updated_at: new Date().toISOString(),
      })
      .select('email, full_name, phone, role, created_at, avatar_url, preferred_payment, is_vip')
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

  const completion = useMemo(() => {
    const checklist = [
      { done: Boolean(fullName.trim()), label: 'add your name' },
      { done: Boolean(phone.trim()), label: 'add phone number' },
      { done: Boolean(avatarUrl), label: 'add a profile photo' },
      { done: emailVerified, label: 'verify your email' },
    ];
    const doneCount = checklist.filter((c) => c.done).length;
    const percent = Math.round((doneCount / checklist.length) * 100);
    const next = checklist.find((c) => !c.done)?.label;
    return { percent, next };
  }, [fullName, phone, avatarUrl, emailVerified]);

  if (loading) {
    return <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Loading profile...</p>;
  }

  const infoCards = [
    { label: 'Stored Email', value: email, icon: Mail },
    { label: 'Phone Number', value: phone || 'Not added', icon: Phone },
    { label: 'Account Role', value: profile?.role || 'customer', icon: ShieldCheck },
    { label: 'Email Status', value: emailVerified ? 'Verified' : 'Not verified', icon: emailVerified ? CheckCircle2 : XCircle },
    { label: 'Member Since', value: memberSince, icon: Calendar },
  ];

  return (
    <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
      {loadError && <p style={{ margin: 0, color: '#B91C1C', fontSize: '0.88rem', fontWeight: 700 }}>{loadError}</p>}

      <div style={{ display: 'grid', gap: '1.25rem' }}>
      {/* Hero: cover banner + avatar + name + profile completion */}
      <AccountCard style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            height: 96,
            background: 'var(--gradient-primary)',
          }}
          aria-hidden="true"
        />
        <div style={{ padding: '0 1.5rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', marginTop: -40 }}>
            <div style={{ position: 'relative' }}>
              <div style={{ border: '4px solid var(--layer-0)', borderRadius: '50%', background: 'var(--layer-0)' }}>
                <Avatar name={fullName} email={email} avatarUrl={avatarUrl} size={84} />
              </div>
              <label
                title="Change profile photo"
                style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'var(--gradient-primary)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid var(--layer-0)',
                  cursor: uploadingAvatar ? 'wait' : 'pointer',
                }}
              >
                <Camera size={14} />
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingAvatar}
                  style={{ display: 'none' }}
                  onChange={handleAvatarChange}
                />
              </label>
            </div>
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {fullName || 'Add your name'}
            </p>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {uploadingAvatar ? 'Uploading photo...' : 'Click the camera icon to update your photo'}
            </p>
          </div>

          {/* Profile completion */}
          <div style={{ marginTop: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Profile {completion.percent}% complete
              </p>
              {completion.next && (
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{completion.next}</p>
              )}
            </div>
            <div style={{ height: 8, borderRadius: 'var(--radius-full)', background: 'var(--layer-2)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${completion.percent}%`,
                  background: 'var(--gradient-primary)',
                  borderRadius: 'var(--radius-full)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        </div>
      </AccountCard>

      {/* Info cards */}
      <AccountCard style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.5rem 1.25rem' }}>
        {infoCards.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} style={{ minWidth: 0 }}>
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
      </AccountCard>

      {/* Membership tier */}
      <AccountCard
        accent={profile?.is_vip ? 'vip' : 'default'}
        hoverable
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              fontWeight: 800,
              fontSize: '0.85rem',
              background: profile?.is_vip ? '#F59E0B' : 'var(--layer-1)',
              color: profile?.is_vip ? '#fff' : 'var(--text-secondary)',
            }}
          >
            <Crown size={15} fill={profile?.is_vip ? 'currentColor' : 'none'} />
            {profile?.is_vip ? 'VIP Member' : 'Standard Member'}
          </div>
          {!profile?.is_vip && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Unlock more with VIP</span>
          )}
        </div>
        <button
          type="button"
          onClick={handleOpenVipBenefits}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            background: 'transparent', border: 'none', color: 'var(--accent)',
            cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', padding: 0,
          }}
        >
          <Sparkles size={14} /> See VIP benefits
        </button>
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

        <label style={{ display: 'grid', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 700 }}>
          Email
          <input value={email} readOnly className={styles.underlineField} style={{ ...fieldStyle, color: 'var(--text-secondary)' }} />
          <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
            Manage email and phone number on the Security page.
          </span>
        </label>

        {/* Preferences */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.9rem', display: 'grid', gap: '0.8rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Preferences</h2>

          <label style={{ display: 'grid', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 700 }}>
            Preferred Payment
            <select
              value={preferredPayment}
              onChange={(event) => setPreferredPayment(event.target.value)}
              className={styles.underlineField}
              style={{ ...fieldStyle, cursor: 'pointer' }}
            >
              {PAYMENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
        </div>

        <AccountButton type="submit" variant="primary" disabled={saving} style={{ justifySelf: 'start' }}>
          {saving ? 'Saving...' : 'Save Profile'}
        </AccountButton>
      </form>
      </div>
    </div>
  );
}
