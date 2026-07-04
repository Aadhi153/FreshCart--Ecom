import { Bell, Sun, Moon, User } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { useAuth } from './AuthProvider';

interface TopbarProps {
  title?: string;
}

export default function Topbar({ title }: TopbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === 'dark';
  const displayEmail = user?.email ?? 'Admin';

  return (
    <header className="admin-topbar">
      {/* Left: Page title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <h2 style={{
          margin: 0,
          fontSize: '1.05rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-body)',
        }}>
          {title}
        </h2>
      </div>

      {/* Right: Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to light' : 'Switch to dark'}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          style={{
            background: 'var(--layer-2)',
            border: '1.5px solid var(--border-color)',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 34,
            height: 34,
            borderRadius: 'var(--radius-sm)',
            transition: 'all 0.2s',
          }}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Notification bell — no notifications backend exists yet, so no unread badge is shown */}
        <button
          aria-label="Notifications"
          style={{
            background: 'var(--layer-2)',
            border: '1.5px solid var(--border-color)',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 34,
            height: 34,
            borderRadius: 'var(--radius-sm)',
            position: 'relative',
          }}
        >
          <Bell size={16} />
        </button>

        {/* User avatar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          paddingLeft: '0.75rem',
          borderLeft: '1px solid var(--border-subtle)',
          cursor: 'pointer',
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'var(--gradient-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <User size={16} color="#fff" />
          </div>
          <div style={{ lineHeight: 1.3 }}>
            <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayEmail}</p>
            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Super Admin</p>
          </div>
        </div>

      </div>
    </header>
  );
}
