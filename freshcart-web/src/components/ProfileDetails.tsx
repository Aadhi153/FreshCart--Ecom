'use client';

import { useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Calendar, Camera, CheckCircle2, Copy, Crown, Gift, KeyRound, LogOut, Mail, MessageCircle, Phone, ShieldCheck, Sparkles, User as UserIcon, X, XCircle } from 'lucide-react';
import type { PublicOffer } from '@freshcart/types';
import { supabase } from '../lib/supabase';
import { uploadAvatarImage, getPublicOffers } from '../lib/api';
import { useProfileSummaryStore } from '../lib/store';
import { useOtpChallenge } from '../lib/useOtpChallenge';
import { useToast } from './ToastProvider';
import { Avatar } from './Avatar';
import { OtpInput } from './OtpInput';
import { ToggleSwitch } from './ToggleSwitch';
import { AccountCard } from './AccountCard';
import { AccountButton } from './AccountButton';
import { AccountTabs } from './AccountTabs';
import styles from './ProfileDetails.module.css';

interface ProfileRow {
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: string;
  created_at: string;
  notification_preferences: {
    email?: boolean;
    push?: boolean;
  } | null;
  avatar_url: string | null;
  preferred_payment: string | null;
  referral_code: string | null;
  is_vip: boolean | null;
}

// Underline-only field: no box, just a bottom border — the .underlineField class in
// ProfileDetails.module.css supplies the focus-state border color (can't do :focus in
// an inline style object), this is the shared base for layout/typography.
const fieldStyle = {
  width: '100%',
  padding: '0.5rem 0',
  border: 'none',
  borderBottom: '1px solid var(--acc-field-border, var(--border-color))',
  borderRadius: 0,
  background: 'transparent',
  color: 'var(--text-primary)',
  fontSize: '0.95rem',
};

const PHONE_REGEX = /^\d{10}$/;

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
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [preferredPayment, setPreferredPayment] = useState('cod');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'security'>('overview');
  const [signingOut, setSigningOut] = useState(false);
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
        .select('email, full_name, phone, role, created_at, notification_preferences, avatar_url, preferred_payment, referral_code, is_vip')
        .eq('id', userData.user.id)
        .maybeSingle();

      if (profileError) {
        setLoadError(profileError.message);
      }

      setProfile(data);
      setFullName(data?.full_name || String(userData.user.user_metadata?.full_name || ''));
      setPhone(data?.phone || userData.user.phone || '');
      setAvatarUrl(data?.avatar_url || null);
      setEmailNotif(data?.notification_preferences?.email !== false);
      setPushNotif(data?.notification_preferences?.push !== false);
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
        notification_preferences: { email: emailNotif, push: pushNotif },
        preferred_payment: preferredPayment,
        updated_at: new Date().toISOString(),
      })
      .select('email, full_name, phone, role, created_at, notification_preferences, avatar_url, preferred_payment, referral_code, is_vip')
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

  const handleCopyReferralCode = async () => {
    if (!profile?.referral_code) return;
    try {
      await navigator.clipboard.writeText(profile.referral_code);
      showToast('Referral code copied!', 'success');
    } catch {
      showToast('Could not copy — copy it manually.', 'error');
    }
  };

  const handleShareReferralWhatsApp = () => {
    if (!profile?.referral_code) return;
    const link = `${window.location.origin}/auth?ref=${profile.referral_code}`;
    const message = `Hey! Use my code ${profile.referral_code} to get ₹50 off your first FreshCart order 🛒 ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  const handleSignOutEverywhere = async () => {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) {
      showToast(error.message, 'error');
      setSigningOut(false);
    }
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

      <div className={styles.tabRow}>
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`${styles.tabButton} ${activeTab === 'overview' ? styles.tabButtonActive : ''}`}
        >
          <UserIcon size={15} />
          Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`${styles.tabButton} ${activeTab === 'security' ? styles.tabButtonActive : ''}`}
        >
          <KeyRound size={15} />
          Security
        </button>
      </div>

      <AccountTabs activeKey={activeTab}>
      {activeTab === 'overview' ? (
      <div style={{ display: 'grid', gap: '1.75rem' }}>
      {/* Avatar */}
      <section style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ position: 'relative' }}>
          <Avatar name={fullName} email={email} avatarUrl={avatarUrl} size={84} />
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
        <div>
          <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {fullName || 'Add your name'}
          </p>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {uploadingAvatar ? 'Uploading photo...' : 'Click the camera icon to update your photo'}
          </p>
        </div>
      </section>

      {/* Profile completion */}
      <section>
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
      </section>

      {/* Referral code */}
      {profile?.referral_code && (
        <section
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            paddingBottom: '1.5rem',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
            <Gift size={18} color="var(--accent)" />
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Your Referral Code</p>
              <p style={{ margin: '0.15rem 0 0', fontSize: '1rem', fontWeight: 800, letterSpacing: '0.04em', color: 'var(--text-primary)' }}>
                {profile.referral_code}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            <AccountButton compact variant="secondary" onClick={handleCopyReferralCode} title="Copy referral code" leftIcon={<Copy size={14} />}>
              Copy
            </AccountButton>
            <AccountButton
              compact
              variant="secondary"
              onClick={handleShareReferralWhatsApp}
              title="Share via WhatsApp"
              leftIcon={<MessageCircle size={14} />}
              style={{ borderColor: '#25D366', background: '#25D366', color: '#fff' }}
            >
              Share
            </AccountButton>
          </div>
        </section>
      )}

      {/* Info cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.5rem 1.25rem' }}>
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
      </section>

      {/* Membership tier */}
      <section
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
          padding: '1.25rem 0',
          borderTop: '1px solid var(--border-color)',
          borderBottom: '1px solid var(--border-color)',
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
      </section>

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
          display: 'grid',
          gap: '1.6rem',
          paddingTop: '0.5rem',
          borderTop: '1px solid var(--border-color)',
        }}
      >
        <h2 style={{ margin: '0.5rem 0 0', fontSize: 'var(--acc-text-section-title-size, 1.05rem)', fontWeight: 700 }}>Edit Profile</h2>

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
            Manage email and phone number in the Security tab.
          </span>
        </label>

        {/* Preferences */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.9rem', display: 'grid', gap: '0.8rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Preferences</h2>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>Email notifications</span>
            <ToggleSwitch checked={emailNotif} onChange={setEmailNotif} label="Toggle email notifications" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>Push notifications</span>
            <ToggleSwitch checked={pushNotif} onChange={setPushNotif} label="Toggle push notifications" />
          </div>

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
      ) : (
        <div style={{ display: 'grid', gap: 'var(--acc-card-gap, 1rem)' }}>
          <AccountCard>
            <div style={{ display: 'grid', gap: '0.9rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Linked Contact Methods</h2>
            <p style={{ margin: '-0.4rem 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              You sign in with a one-time code. Link both an email and a phone number so you can use either.
            </p>
            <ContactLinkRow
              icon={Mail}
              label="Email"
              currentValue={profile?.email || null}
              placeholder="you@example.com"
              onLinked={(value) => {
                setProfile((prev) => prev ? { ...prev, email: value } : prev);
              }}
            />
            <ContactLinkRow
              icon={Phone}
              label="Phone Number"
              currentValue={phone || null}
              placeholder="98765 43210"
              prefix="+91"
              onLinked={(value) => {
                setPhone(value);
                setProfile((prev) => prev ? { ...prev, phone: value } : prev);
              }}
            />
            </div>
          </AccountCard>

          <AccountCard accent="danger" className={styles.dangerCard}>
            <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Sign Out Everywhere</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              End your session on this device and every other device you&apos;re signed in on.
            </p>
            <AccountButton variant="danger" disabled={signingOut} onClick={handleSignOutEverywhere} leftIcon={<LogOut size={15} />} style={{ justifySelf: 'start' }}>
              {signingOut ? 'Signing out...' : 'Sign out everywhere'}
            </AccountButton>
          </AccountCard>
        </div>
      )}
      </AccountTabs>
    </div>
  );
}

interface ContactLinkRowProps {
  icon: typeof Mail;
  label: string;
  currentValue: string | null;
  placeholder: string;
  prefix?: string;
  onLinked: (value: string) => void;
}

function ContactLinkRow({ icon: Icon, label, currentValue, placeholder, prefix, onLinked }: ContactLinkRowProps) {
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const isPhone = Boolean(prefix);

  const otp = useOtpChallenge({
    cooldownSeconds: 30,
    sendOtp: async () => {
      const cleaned = value.trim();
      if (isPhone) {
        if (!PHONE_REGEX.test(cleaned)) throw new Error('Enter a valid 10-digit phone number.');
        const { error } = await supabase.auth.updateUser({ phone: `${prefix}${cleaned}` });
        if (error) throw error;
      } else {
        if (!cleaned) throw new Error('Enter an email address.');
        const { error } = await supabase.auth.updateUser({ email: cleaned });
        if (error) throw error;
      }
    },
    verifyOtp: async (code) => {
      const cleaned = value.trim();
      const finalValue = isPhone ? `${prefix}${cleaned}` : cleaned;
      const { error } = isPhone
        ? await supabase.auth.verifyOtp({ phone: finalValue, token: code, type: 'phone_change' })
        : await supabase.auth.verifyOtp({ email: finalValue, token: code, type: 'email_change' });
      if (error) throw error;

      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await supabase
          .from('profiles')
          .update({ [isPhone ? 'phone' : 'email']: finalValue, updated_at: new Date().toISOString() })
          .eq('id', userData.user.id);
      }

      onLinked(finalValue);
      showToast(`${label} linked successfully.`, 'success');
    },
  });

  useEffect(() => {
    if (otp.stage !== 'success') return;
    const timeout = setTimeout(() => {
      setEditing(false);
      setValue('');
      otp.reset();
    }, 1200);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp.stage]);

  const cancel = () => {
    setEditing(false);
    setValue('');
    otp.reset();
  };

  return (
    <div className={styles.linkRow}>
      <div className={styles.linkRowHeader}>
        <div className={styles.linkIcon}>
          <Icon size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className={styles.linkLabel}>{label}</p>
          <p className={styles.linkValue}>{currentValue || 'Not linked'}</p>
        </div>
        {!editing && otp.stage === 'idle' && (
          <AccountButton compact variant="secondary" onClick={() => setEditing(true)}>
            {currentValue ? 'Change' : 'Add'}
          </AccountButton>
        )}
      </div>

      {editing && otp.stage === 'idle' && (
        <div className={styles.linkEditRow}>
          {isPhone ? (
            <div className={styles.phoneWrapperSmall}>
              <span>{prefix}</span>
              <input
                value={value}
                onChange={(event) => setValue(event.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder={placeholder}
                inputMode="numeric"
              />
            </div>
          ) : (
            <input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={placeholder}
              type="email"
              className={styles.underlineField}
              style={fieldStyle}
            />
          )}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <AccountButton compact variant="primary" onClick={otp.send}>Send OTP</AccountButton>
            <AccountButton compact variant="secondary" onClick={cancel}>Cancel</AccountButton>
          </div>
        </div>
      )}

      {otp.stage === 'sending' && <p className={styles.linkHint}>Sending code...</p>}

      {(otp.stage === 'sent' || otp.stage === 'verifying' || otp.stage === 'success') && (
        <div className={styles.linkOtpBlock}>
          {otp.error && <p className={styles.linkError}>{otp.error}</p>}
          <OtpInput
            onComplete={otp.verify}
            status={otp.stage === 'success' ? 'success' : otp.error ? 'error' : 'idle'}
            errorKey={otp.errorKey}
            disabled={otp.stage === 'verifying' || otp.stage === 'success'}
          />
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {otp.stage !== 'success' && (
              otp.canResend ? (
                <AccountButton compact variant="secondary" onClick={otp.send}>Resend OTP</AccountButton>
              ) : (
                <span className={styles.linkHint}>Resend in {otp.secondsLeft}s</span>
              )
            )}
            {otp.stage !== 'success' && (
              <AccountButton compact variant="secondary" onClick={cancel}>Cancel</AccountButton>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
