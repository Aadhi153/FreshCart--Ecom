'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Leaf, Loader2, Mail, Phone, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOtpChallenge } from '../../lib/useOtpChallenge';
import { useToast } from '../../components/ToastProvider';
import { OtpInput } from '../../components/OtpInput';
import styles from './page.module.css';

type Mode = 'login' | 'signup';
type Tab = 'email' | 'phone';

const PHONE_REGEX = /^\d{10}$/;

export default function AuthPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [mode, setMode] = useState<Mode>('login');
  const [tab, setTab] = useState<Tab>('email');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [sentAt, setSentAt] = useState(0);

  const usingPhone = mode === 'login' && tab === 'phone';

  const otp = useOtpChallenge({
    cooldownSeconds: 30,
    sendOtp: async () => {
      if (usingPhone) {
        const cleaned = phone.trim();
        if (!PHONE_REGEX.test(cleaned)) throw new Error('Enter a valid 10-digit phone number.');
        const { error } = await supabase.auth.signInWithOtp({
          phone: `+91${cleaned}`,
          options: { shouldCreateUser: true },
        });
        if (error) throw error;
      } else {
        if (mode === 'signup' && !fullName.trim()) throw new Error('Enter your full name.');
        const cleanedEmail = email.trim();
        if (!cleanedEmail) throw new Error('Enter your email address.');
        const cleanedPhone = phone.trim();
        if (mode === 'signup' && cleanedPhone && !PHONE_REGEX.test(cleanedPhone)) {
          throw new Error('Enter a valid 10-digit phone number, or leave it blank.');
        }
        const { error } = await supabase.auth.signInWithOtp({
          email: cleanedEmail,
          options: {
            shouldCreateUser: true,
            data: mode === 'signup'
              ? { full_name: fullName.trim(), phone: cleanedPhone ? `+91${cleanedPhone}` : null }
              : undefined,
          },
        });
        if (error) throw error;
      }
      setSentAt(Date.now());
    },
    verifyOtp: async (code) => {
      const { error } = usingPhone
        ? await supabase.auth.verifyOtp({ phone: `+91${phone.trim()}`, token: code, type: 'sms' })
        : await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: 'email' });
      if (error) throw error;

      const { data: userData } = await supabase.auth.getUser();
      if (userData.user && mode === 'signup') {
        await supabase
          .from('profiles')
          .update({
            full_name: fullName.trim(),
            ...(phone.trim() ? { phone: `+91${phone.trim()}` } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq('id', userData.user.id);
      }

      showToast(`Welcome${fullName.trim() ? `, ${fullName.trim()}` : ''}!`, 'success');
      router.push('/');
    },
  });

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setTab('email');
    otp.reset();
  };

  const switchTab = (nextTab: Tab) => {
    setTab(nextTab);
    otp.reset();
  };

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) {
      showToast(error.message, 'error');
      setGoogleLoading(false);
    }
  };

  const inputsLocked = otp.stage !== 'idle';
  const identityLabel = usingPhone ? `+91 ${phone.trim()}` : email.trim();

  return (
    <main className={styles.authMain}>
      <div className={styles.authCard}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>
            <Leaf size={18} color="#fff" />
          </div>
          <span className={styles.brandName}>FreshCart</span>
        </div>
        <p className={styles.tagline}>Farm fresh groceries, delivered fast.</p>

        <div className={styles.modeRow}>
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`${styles.modeButton} ${mode === 'login' ? styles.modeButtonActive : ''}`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            className={`${styles.modeButton} ${mode === 'signup' ? styles.modeButtonActive : ''}`}
          >
            Sign Up
          </button>
        </div>

        {mode === 'login' && (
          <div className={styles.tabRow}>
            <button
              type="button"
              onClick={() => switchTab('email')}
              className={`${styles.tabButton} ${tab === 'email' ? styles.tabButtonActive : ''}`}
            >
              <Mail size={14} />
              Email
            </button>
            <button
              type="button"
              onClick={() => switchTab('phone')}
              className={`${styles.tabButton} ${tab === 'phone' ? styles.tabButtonActive : ''}`}
            >
              <Phone size={14} />
              Phone Number
            </button>
          </div>
        )}

        <div key={`${mode}-${tab}`} className={styles.panel}>
          {mode === 'signup' && (
            <div className={styles.inputGroup}>
              <label htmlFor="auth-name">Full Name</label>
              <div className={styles.inputWrapper}>
                <User size={16} className={styles.inputIcon} />
                <input
                  id="auth-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  disabled={inputsLocked}
                />
              </div>
            </div>
          )}

          {!usingPhone && (
            <div className={styles.inputGroup}>
              <label htmlFor="auth-email">Email Address</label>
              <div className={styles.inputWrapper}>
                <Mail size={16} className={styles.inputIcon} />
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={inputsLocked}
                />
              </div>
            </div>
          )}

          {(usingPhone || mode === 'signup') && (
            <div className={styles.inputGroup}>
              <label htmlFor="auth-phone">
                Phone Number {mode === 'signup' && <span className={styles.optionalTag}>(optional)</span>}
              </label>
              <div className={styles.phoneWrapper}>
                <span className={styles.phonePrefix}>+91</span>
                <input
                  id="auth-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="98765 43210"
                  inputMode="numeric"
                  disabled={inputsLocked}
                />
              </div>
            </div>
          )}

          {otp.error && <div className={styles.errorBanner}>{otp.error}</div>}

          {!inputsLocked ? (
            <button type="button" className={styles.submitButton} onClick={otp.send}>
              {mode === 'signup' ? 'Create Account' : 'Send OTP'}
            </button>
          ) : otp.stage === 'sending' ? (
            <button type="button" className={styles.submitButton} disabled>
              <Loader2 className={styles.spinner} size={18} />
            </button>
          ) : (
            <div className={styles.otpSection}>
              <p className={styles.otpHint}>
                Enter the 6-digit code sent to {identityLabel}
                {' · '}
                <button type="button" onClick={() => otp.reset()} className={styles.changeLink}>
                  Change
                </button>
              </p>
              <OtpInput
                onComplete={otp.verify}
                status={otp.stage === 'success' ? 'success' : otp.error ? 'error' : 'idle'}
                errorKey={otp.errorKey}
                disabled={otp.stage === 'verifying' || otp.stage === 'success'}
                resetKey={sentAt}
              />
              <div className={styles.resendRow}>
                {otp.canResend ? (
                  <button type="button" onClick={otp.send} className={styles.resendLink}>
                    Resend OTP
                  </button>
                ) : (
                  <span className={styles.countdownText}>Resend OTP in {otp.secondsLeft}s</span>
                )}
              </div>
            </div>
          )}
        </div>

        {mode === 'login' && !inputsLocked && (
          <>
            <div className={styles.divider}>
              <span>OR</span>
            </div>

            <button className={styles.googleButton} onClick={handleGoogleAuth} disabled={googleLoading}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              {googleLoading ? 'Redirecting...' : 'Continue with Google'}
            </button>
          </>
        )}

        <div className={styles.backLink}>
          <Link href="/">← Return to Store</Link>
        </div>
      </div>
    </main>
  );
}
