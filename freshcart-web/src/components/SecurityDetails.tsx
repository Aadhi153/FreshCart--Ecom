'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, LogOut, Mail, Phone, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { deleteMyAccount } from '../lib/api';
import { useOtpChallenge } from '../lib/useOtpChallenge';
import { useToast } from './ToastProvider';
import { AccountCard } from './AccountCard';
import { AccountButton } from './AccountButton';
import { OtpInput } from './OtpInput';
import styles from './SecurityDetails.module.css';

const fieldStyle = {
  width: '100%',
  padding: '0.7rem 0.8rem',
  border: '1px solid var(--acc-field-border, var(--border-color))',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--layer-0)',
  color: 'var(--text-primary)',
  fontSize: '0.95rem',
};

const PHONE_REGEX = /^\d{10}$/;

export function SecurityDetails() {
  const { showToast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email || null);
      setPhone(data.user?.phone || null);
    });
  }, []);

  const handleSignOutEverywhere = async () => {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) {
      showToast(error.message, 'error');
      setSigningOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteMyAccount();
      await supabase.auth.signOut();
      router.push('/');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete account.', 'error');
      setDeleting(false);
    }
  };

  const canDelete = deleteConfirmText.trim().toLowerCase() === (email || '').toLowerCase() && Boolean(email);

  return (
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
            currentValue={email}
            placeholder="you@example.com"
            onLinked={(value) => setEmail(value)}
          />
          <ContactLinkRow
            icon={Phone}
            label="Phone Number"
            currentValue={phone}
            placeholder="98765 43210"
            prefix="+91"
            onLinked={(value) => setPhone(value)}
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

      <AccountCard accent="danger" className={styles.dangerCard}>
        <h2 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <AlertTriangle size={17} color="#EF4444" /> Delete Account
        </h2>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
          This permanently deletes your account and profile. Your past orders are kept for
          records but are no longer linked to you. This cannot be undone.
        </p>
        <label style={{ display: 'grid', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 700, maxWidth: '22rem' }}>
          Type your email ({email || '...'}) to confirm
          <input
            value={deleteConfirmText}
            onChange={(event) => setDeleteConfirmText(event.target.value)}
            placeholder={email || ''}
            style={fieldStyle}
          />
        </label>
        <AccountButton
          variant="danger-solid"
          disabled={!canDelete || deleting}
          onClick={handleDeleteAccount}
          leftIcon={<Trash2 size={15} />}
          style={{ justifySelf: 'start' }}
        >
          {deleting ? 'Deleting...' : 'Permanently delete my account'}
        </AccountButton>
      </AccountCard>
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
