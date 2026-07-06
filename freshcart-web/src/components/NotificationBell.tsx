'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getNotifications, markAllNotificationsRead, markNotificationRead, type AppNotification } from '../lib/api';

interface NotificationBellProps {
  session: Session | null;
  iconBtnStyle: CSSProperties;
}

const POLL_INTERVAL_MS = 30000;

export function NotificationBell({ session, iconBtnStyle }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!session) {
      setNotifications([]);
      return;
    }

    let cancelled = false;
    const fetchNotifications = () => {
      getNotifications()
        .then((data) => { if (!cancelled) setNotifications(data); })
        .catch(() => {});
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [session]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  if (!session) return null;

  const handleToggle = () => setOpen((o) => !o);

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await markAllNotificationsRead();
    } catch {
      // Best-effort; a stray unread badge on failure isn't worth surfacing an error for.
    }
  };

  const handleItemClick = async (notification: AppNotification) => {
    if (notification.read) return;
    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
    try {
      await markNotificationRead(notification.id);
    } catch {
      // Best-effort, same as above.
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={handleToggle}
        style={{ ...iconBtnStyle, position: 'relative' }}
        title="Notifications"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -6, right: -6,
            background: 'var(--gradient-primary)',
            color: '#fff',
            fontSize: '0.62rem', fontWeight: 800,
            borderRadius: '50%', width: 18, height: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.5rem)',
            right: 0,
            width: 320,
            maxHeight: 400,
            overflowY: 'auto',
            background: 'var(--layer-1)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md, 0 8px 24px rgba(0,0,0,0.15))',
            zIndex: 300,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0.9rem', borderBottom: '1px solid var(--border-color)' }}>
            <strong style={{ fontSize: '0.85rem' }}>Notifications</strong>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p style={{ margin: 0, padding: '1.25rem 0.9rem', color: 'var(--text-secondary)', fontSize: '0.82rem', textAlign: 'center' }}>
              No notifications yet.
            </p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                role="menuitem"
                onClick={() => handleItemClick(n)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.7rem 0.9rem',
                  background: n.read ? 'transparent' : 'var(--primary-light, rgba(99,102,241,0.08))',
                  border: 'none',
                  borderBottom: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                }}
              >
                <p style={{ margin: '0 0 0.2rem', fontSize: '0.82rem', fontWeight: n.read ? 600 : 800 }}>{n.title}</p>
                {n.body && <p style={{ margin: '0 0 0.25rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{n.body}</p>}
                <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--text-muted, var(--text-secondary))' }}>
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
