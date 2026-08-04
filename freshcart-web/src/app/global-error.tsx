'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="theme-web theme-light">
        <main
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: '1rem',
            padding: '3rem 1.5rem',
            fontFamily: 'sans-serif',
          }}
        >
          <span style={{ fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3b82f6' }}>
            Application error
          </span>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>FreshCart hit a snag</h1>
          <p style={{ margin: 0, maxWidth: '32rem', color: '#666', lineHeight: 1.6 }}>
            Something went wrong loading the app. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: '0.5rem',
              padding: '0.82rem 1.4rem',
              borderRadius: '8px',
              border: 'none',
              background: '#3b82f6',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
