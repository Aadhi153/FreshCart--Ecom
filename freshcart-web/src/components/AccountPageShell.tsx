'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import { Apple, Carrot, Cherry, Citrus, Heart, Leaf, MapPin, Package, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useProfileSummaryStore } from '../lib/store';
import { Avatar } from './Avatar';

interface AccountPageShellProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function AccountPageShell({ title, description, children }: AccountPageShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { fullName, avatarUrl, hasLoaded, setProfileSummary } = useProfileSummaryStore();

  const accountLinks = [
    { href: '/profile', label: 'Profile', detail: 'Personal details', icon: User },
    { href: '/orders', label: 'Orders', detail: 'Purchases and status', icon: Package },
    { href: '/address', label: 'Address', detail: 'Delivery locations', icon: MapPin },
    { href: '/wishlist', label: 'Wishlist', detail: 'Saved products', icon: Heart },
  ];

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
      <div className="account-floaters" aria-hidden="true">
        <span className="account-floater account-floater--apple"><Apple /></span>
        <span className="account-floater account-floater--leaf"><Leaf /></span>
        <span className="account-floater account-floater--citrus"><Citrus /></span>
        <span className="account-floater account-floater--carrot"><Carrot /></span>
        <span className="account-floater account-floater--cherry"><Cherry /></span>
        <span className="account-floater account-floater--leaf-small"><Leaf /></span>
      </div>
      <section
        className="account-layout"
        style={{
          maxWidth: 1080,
          margin: '0 auto',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        <aside
          className="account-sidebar"
          style={{
            background: 'color-mix(in srgb, var(--layer-0) 84%, transparent)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid color-mix(in srgb, var(--border-color) 86%, transparent)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)',
            padding: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '1rem', paddingBottom: '0.85rem', borderBottom: '1px solid var(--border-color)' }}>
            <Avatar name={fullName} email={session?.user.email} avatarUrl={avatarUrl} size={44} />
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {fullName || session?.user.email || 'My Account'}
              </p>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {session?.user.email}
              </p>
            </div>
          </div>
          <nav style={{ display: 'grid', gap: '0.35rem' }} aria-label="Account navigation">
            {accountLinks.map(({ href, label, detail, icon: Icon }) => {
              const active = pathname === href;

              return (
                <Link
                  key={href}
                  href={href}
                  className={`account-nav-link${active ? ' account-nav-link--active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className="account-nav-link-icon">
                    <Icon size={15} />
                  </span>
                  <span>
                    <span style={{ display: 'block', fontSize: '0.9rem' }}>{label}</span>
                    <span style={{ display: 'block', marginTop: 2, fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {detail}
                    </span>
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <section
          style={{
            background: 'color-mix(in srgb, var(--layer-0) 84%, transparent)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid color-mix(in srgb, var(--border-color) 86%, transparent)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)',
            padding: '1.5rem',
            minWidth: 0,
          }}
        >
          <h1 style={{ margin: '0 0 0.35rem', fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1.1 }}>{title}</h1>
          <p style={{ margin: '0 0 1.25rem', color: 'var(--text-secondary)', fontSize: '0.98rem' }}>{description}</p>
          {children}
        </section>
      </section>
    </main>
  );
}
