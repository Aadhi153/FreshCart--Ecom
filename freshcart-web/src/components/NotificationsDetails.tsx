'use client';

import { useEffect, useState } from 'react';
import { Bell, Mail, Smartphone } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './ToastProvider';
import { AccountCard } from './AccountCard';
import { AccountButton } from './AccountButton';
import { ToggleSwitch } from './ToggleSwitch';

export function NotificationsDetails() {
  const { showToast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setLoading(false);
        return;
      }
      setUserId(userData.user.id);

      const { data } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('id', userData.user.id)
        .maybeSingle();

      setEmailNotif(data?.notification_preferences?.email !== false);
      setPushNotif(data?.notification_preferences?.push !== false);
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        notification_preferences: { email: emailNotif, push: pushNotif },
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast('Notification preferences saved.', 'success');
    }
    setSaving(false);
  };

  if (loading) {
    return <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Loading preferences...</p>;
  }

  return (
    <AccountCard style={{ display: 'grid', gap: '1.1rem' }}>
      <h2 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <Bell size={17} /> Notification Preferences
      </h2>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', paddingBottom: '0.9rem', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Mail size={16} color="var(--text-secondary)" />
          <div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>Email notifications</p>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Order updates, promotions, and account alerts.</p>
          </div>
        </div>
        <ToggleSwitch checked={emailNotif} onChange={setEmailNotif} label="Toggle email notifications" />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Smartphone size={16} color="var(--text-secondary)" />
          <div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>Push notifications</p>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Delivery status and time-sensitive offers.</p>
          </div>
        </div>
        <ToggleSwitch checked={pushNotif} onChange={setPushNotif} label="Toggle push notifications" />
      </div>

      <AccountButton variant="primary" onClick={handleSave} disabled={saving} style={{ justifySelf: 'start' }}>
        {saving ? 'Saving...' : 'Save Preferences'}
      </AccountButton>
    </AccountCard>
  );
}
