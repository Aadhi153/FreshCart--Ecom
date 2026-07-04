'use client';

import Link from 'next/link';
import { Leaf, Mail } from 'lucide-react';
import { usePathname } from 'next/navigation';

export function Footer() {
  const pathname = usePathname();

  if (pathname?.startsWith('/auth')) {
    return null;
  }

  const linkStyle: React.CSSProperties = {
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    fontSize: '0.9rem',
    transition: 'color 0.18s',
    display: 'inline-block',
  };

  return (
    <footer style={{
      background: 'color-mix(in srgb, var(--layer-1) 88%, transparent)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderTop: '1px solid color-mix(in srgb, var(--border-color) 86%, transparent)',
    }}>
      {/* Main footer grid */}
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: '4rem 2rem 3rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '2.5rem',
      }}>
        {/* Brand column */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <div style={{
              width: 30, height: 30,
              background: 'var(--gradient-primary)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Leaf size={16} color="#fff" />
            </div>
            <span style={{
              fontSize: '1.15rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)',
            }}>
              FreshCart
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            Your one-stop shop for farm-fresh produce, snacks, and everyday essentials — delivered fast.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 style={{ margin: '0 0 1rem', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
            Quick Links
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {[
              { href: '/',      label: 'Home' },
              { href: '/shop',  label: 'Shop' },
              { href: '/cart',  label: 'Cart' },
              { href: '/auth',  label: 'My Account' },
            ].map(({ href, label }) => (
              <li key={href}>
                <Link href={href} style={linkStyle}>{label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Customer Service */}
        <div>
          <h4 style={{ margin: '0 0 1rem', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
            Help
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <li><Link href="/contact" style={linkStyle}>Contact Us</Link></li>
            {/* No dedicated pages exist yet for these, so they're shown as plain text
                rather than dead links that look clickable but go nowhere. */}
            {['FAQ', 'Shipping & Returns', 'Privacy Policy'].map(label => (
              <li key={label}>
                <span style={{ ...linkStyle, cursor: 'default' }}>{label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Newsletter */}
        <div>
          <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
            Newsletter
          </h4>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Get exclusive deals and fresh arrivals straight to your inbox.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              type="email"
              placeholder="your@email.com"
              style={{
                padding: '0.65rem 0.9rem',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--border-color)',
                backgroundColor: 'var(--layer-0)',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
                flex: '1 1 150px',
                minWidth: 0,
                outline: 'none',
              }}
            />
            <button style={{
              background: 'var(--gradient-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '0.65rem 1rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.3rem',
              whiteSpace: 'nowrap',
              fontSize: '0.85rem',
              flex: '1 0 auto',
            }}>
              <Mail size={14} /> Subscribe
            </button>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '1.25rem 2rem',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.82rem',
      }}>
        © {new Date().getFullYear()} FreshCart. All rights reserved. Built with 💚
      </div>
    </footer>
  );
}
