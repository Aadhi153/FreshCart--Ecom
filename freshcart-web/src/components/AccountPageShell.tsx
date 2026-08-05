'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import {
  Bell,
  CreditCard,
  Gift,
  Heart,
  HelpCircle,
  KeyRound,
  LogOut,
  MapPin,
  Package,
  Star,
  Undo2,
  User,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useProfileSummaryStore } from '../lib/store';
import { Avatar } from './Avatar';

interface AccountPageShellProps {
  title: string;
  description: string;
  children: ReactNode;
}

interface AccountNavItem {
  href: string;
  label: string;
  icon: typeof User;
}

interface AccountNavGroup {
  title: string | null;
  items: AccountNavItem[];
}

const accountGroups: AccountNavGroup[] = [
  { title: 'Account', items: [
    { href: '/profile', label: 'Profile', icon: User },
    { href: '/security', label: 'Security', icon: KeyRound },
  ] },
  { title: 'Shopping', items: [
    { href: '/orders', label: 'Orders', icon: Package },
    { href: '/returns', label: 'Returns & Refunds', icon: Undo2 },
    { href: '/wishlist', label: 'Wishlist', icon: Heart },
    { href: '/reviews', label: 'My Reviews', icon: Star },
  ] },
  { title: 'Payments & Rewards', items: [
    { href: '/payment-methods', label: 'Payment Methods', icon: CreditCard },
    { href: '/rewards', label: 'Coupons & Rewards', icon: Gift },
  ] },
  { title: 'Settings', items: [
    { href: '/address', label: 'Address', icon: MapPin },
    { href: '/notifications', label: 'Notifications', icon: Bell },
  ] },
  { title: 'Support', items: [
    { href: '/help', label: 'Help & Support', icon: HelpCircle },
  ] },
];

export function AccountPageShell({ title, description, children }: AccountPageShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const { fullName, avatarUrl, hasLoaded, setProfileSummary } = useProfileSummaryStore();

  const handleLogout = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push('/');
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (!data.session) {
        router.replace('/auth');
        return;
      }
      setSession(data.session);
      setLoading(false);
    }).catch(() => {
      if (mounted) router.replace('/auth');
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      if (!nextSession) {
        router.replace('/auth');
        return;
      }
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (!session || hasLoaded) return;
    supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        setProfileSummary({
          fullName: data?.full_name || String(session.user.user_metadata?.full_name || ''),
          avatarUrl: data?.avatar_url || null,
        });
      });
  }, [session, hasLoaded, setProfileSummary]);

  if (loading) {
    return (
      <main style={{ minHeight: '70vh', padding: '4rem 2rem', textAlign: 'center' }}>
        Loading account...
      </main>
    );
  }

  return (
    <main className="account-page" style={{ minHeight: '70vh', padding: '2rem 1.5rem' }}>
      <section
        className="account-layout"
        style={{
          maxWidth: 1080,
          margin: '0 auto',
          gap: 'var(--acc-sidebar-gap, 2rem)',
          alignItems: 'start',
        }}
      >
        <aside
          className="account-sidebar"
          style={{
            background: 'var(--layer-0)',
            border: 'var(--acc-card-border, 1px solid var(--border-color))',
            borderRadius: 'var(--acc-card-radius, var(--radius-lg))',
            padding: '1.5rem 1rem',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.15rem', marginBottom: '1.75rem' }}>
            <div style={{ marginBottom: '0.65rem' }}>
              <Avatar name={fullName} email={session?.user.email} avatarUrl={avatarUrl} size={64} />
            </div>
            <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.92rem', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
              {fullName || session?.user.email || 'My Account'}
            </p>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.76rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
              {session?.user.email}
            </p>
          </div>
          <nav aria-label="Account navigation">
            {accountGroups.map((group, groupIndex) => (
              <div key={group.title || groupIndex} style={{ marginTop: groupIndex === 0 ? 0 : '1rem' }}>
                {group.title && (
                  <p
                    style={{
                      margin: '0 0 0.35rem',
                      padding: '0 0.7rem',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {group.title}
                  </p>
                )}
                <div>
                  {group.items.map(({ href, label, icon: Icon }, itemIndex) => {
                    const active = pathname === href;

                    return (
                      <Link
                        key={href}
                        href={href}
                        className={`account-nav-link${active ? ' account-nav-link--active' : ''}`}
                        aria-current={active ? 'page' : undefined}
                        style={{ marginTop: itemIndex === 0 ? 0 : '0.2rem' }}
                      >
                        <span className="account-nav-link-icon">
                          <Icon size={16} />
                        </span>
                        <span style={{ fontSize: '0.9rem' }}>{label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={handleLogout}
              disabled={signingOut}
              className="account-nav-link"
              style={{ width: '100%', border: 'none', background: 'transparent', cursor: signingOut ? 'wait' : 'pointer' }}
            >
              <span className="account-nav-link-icon">
                <LogOut size={16} />
              </span>
              <span style={{ fontSize: '0.9rem' }}>{signingOut ? 'Signing out...' : 'Log out'}</span>
            </button>
          </div>
        </aside>

        <section
          style={{
            background: 'var(--layer-0)',
            minWidth: 0,
            padding: 'var(--acc-card-padding, 1.5rem) 0',
          }}
        >
          <h1 style={{ margin: '0 0 0.35rem', fontFamily: 'var(--acc-font-display, var(--font-display))', fontSize: 'var(--acc-text-page-title-size, 2rem)', fontWeight: 'var(--acc-text-page-title-weight, 700)', letterSpacing: 'var(--acc-text-page-title-tracking, normal)', lineHeight: 1.1 }}>{title}</h1>
          <p style={{ margin: '0 0 1.25rem', color: 'var(--text-secondary)', fontSize: '0.98rem' }}>{description}</p>
          {children}
        </section>
      </section>
    </main>
  );
}
