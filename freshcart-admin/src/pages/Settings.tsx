import { useEffect, useState } from 'react';
import type { CSSProperties, ElementType } from 'react';
import { Store, Bell, CreditCard, Truck } from 'lucide-react';
import { useToast } from '../components/ToastProvider';

type TabKey = 'store' | 'notifications' | 'payments' | 'delivery';

const tabs: { key: TabKey; label: string; icon: ElementType }[] = [
  { key: 'store', label: 'Store Info', icon: Store },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'payments', label: 'Payments', icon: CreditCard },
  { key: 'delivery', label: 'Delivery', icon: Truck },
];

const inputStyle: CSSProperties = {
  width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-color)', backgroundColor: 'var(--layer-0)',
  color: 'var(--text-primary)', fontSize: '0.9rem', boxSizing: 'border-box',
};

const labelStyle: CSSProperties = {
  display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem',
  fontWeight: 500, color: 'var(--text-secondary)',
};

const errorTextStyle: CSSProperties = {
  fontSize: '0.8rem', color: 'var(--danger)', margin: '0.4rem 0 0',
};

const saveButtonStyle: CSSProperties = {
  padding: '0.75rem 2rem', backgroundColor: 'var(--primary)', color: 'white',
  border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600,
  cursor: 'pointer', alignSelf: 'flex-start',
};

interface StoreInfo {
  name: string;
  tagline: string;
  email: string;
  phone: string;
  address: string;
}

interface NotificationPrefs {
  newOrders: boolean;
  lowStock: boolean;
  customerSignups: boolean;
  dailySummary: boolean;
}

interface DeliverySettings {
  freeDeliveryMin: string;
  deliveryFee: string;
  estimatedTime: string;
  pincodes: string;
}

const STORAGE_KEY = 'freshcart-admin-settings';

const defaultSettings = {
  store: {
    name: 'FreshCart',
    tagline: 'Farm Fresh. Delivered Fast.',
    email: 'hello@freshcart.com',
    phone: '+91 98765 43210',
    address: '123, Farm Road, Green Valley, India - 560001',
  } satisfies StoreInfo,
  notifications: {
    newOrders: true,
    lowStock: true,
    customerSignups: true,
    dailySummary: true,
  } satisfies NotificationPrefs,
  delivery: {
    freeDeliveryMin: '500',
    deliveryFee: '40',
    estimatedTime: '30-60 minutes',
    pincodes: '560001, 560002, 560003, 560038',
  } satisfies DeliverySettings,
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
}

const notificationFields: { key: keyof NotificationPrefs; label: string; description: string }[] = [
  { key: 'newOrders', label: 'New Order Alerts', description: 'Get notified when a new order is placed' },
  { key: 'lowStock', label: 'Low Stock Alerts', description: 'Alert when product stock falls below threshold' },
  { key: 'customerSignups', label: 'Customer Signups', description: 'Notify when a new customer registers' },
  { key: 'dailySummary', label: 'Daily Summary Email', description: 'Receive daily sales summary every morning' },
];

function validateStore(store: StoreInfo): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!store.name.trim()) errors.name = 'Store name is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(store.email.trim())) errors.email = 'Enter a valid email address.';
  if (store.phone.replace(/\D/g, '').length < 10) errors.phone = 'Enter a valid phone number (at least 10 digits).';
  if (!store.address.trim()) errors.address = 'Store address is required.';
  return errors;
}

function validateDelivery(delivery: DeliverySettings): Record<string, string> {
  const errors: Record<string, string> = {};
  const freeMin = Number(delivery.freeDeliveryMin);
  if (delivery.freeDeliveryMin.trim() === '' || Number.isNaN(freeMin) || freeMin < 0) errors.freeDeliveryMin = 'Enter a valid amount (0 or more).';
  const fee = Number(delivery.deliveryFee);
  if (delivery.deliveryFee.trim() === '' || Number.isNaN(fee) || fee < 0) errors.deliveryFee = 'Enter a valid amount (0 or more).';
  if (!delivery.estimatedTime.trim()) errors.estimatedTime = 'Estimated delivery time is required.';
  const pincodes = delivery.pincodes.split(',').map(p => p.trim()).filter(Boolean);
  if (pincodes.length === 0 || pincodes.some(p => !/^\d{6}$/.test(p))) errors.pincodes = 'Enter comma-separated 6-digit pincodes.';
  return errors;
}

export default function Settings() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>('store');
  const [store, setStore] = useState<StoreInfo>(defaultSettings.store);
  const [notifications, setNotifications] = useState<NotificationPrefs>(defaultSettings.notifications);
  const [delivery, setDelivery] = useState<DeliverySettings>(defaultSettings.delivery);
  const [storeErrors, setStoreErrors] = useState<Record<string, string>>({});
  const [deliveryErrors, setDeliveryErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loaded = loadSettings();
    setStore(loaded.store);
    setNotifications(loaded.notifications);
    setDelivery(loaded.delivery);
  }, []);

  function persist(next: Partial<{ store: StoreInfo; notifications: NotificationPrefs; delivery: DeliverySettings }>) {
    const current = loadSettings();
    const merged = { ...current, ...next };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    showToast('Settings saved', 'success');
  }

  function handleSaveStore() {
    const errors = validateStore(store);
    setStoreErrors(errors);
    if (Object.keys(errors).length > 0) return;
    persist({ store });
  }

  function handleSaveDelivery() {
    const errors = validateDelivery(delivery);
    setDeliveryErrors(errors);
    if (Object.keys(errors).length > 0) return;
    persist({ delivery });
  }

  return (
    <div>
      <h1 style={{ marginTop: 0, marginBottom: '2rem' }}>Settings</h1>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.6rem 1.25rem', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)', cursor: 'pointer',
              backgroundColor: activeTab === key ? 'var(--primary)' : 'var(--layer-1)',
              color: activeTab === key ? '#fff' : 'var(--text-secondary)',
              fontWeight: activeTab === key ? 600 : 400,
              transition: 'all 0.2s',
            }}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="spatial-card" style={{ padding: '2rem' }}>
        {activeTab === 'store' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 600 }}>
            <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Store Information</h2>
            <div>
              <label style={labelStyle}>Store Name</label>
              <input style={inputStyle} value={store.name} onChange={e => setStore({ ...store, name: e.target.value })} />
              {storeErrors.name && <p style={errorTextStyle}>{storeErrors.name}</p>}
            </div>
            <div>
              <label style={labelStyle}>Store Tagline</label>
              <input style={inputStyle} value={store.tagline} onChange={e => setStore({ ...store, tagline: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Contact Email</label>
              <input style={inputStyle} type="email" value={store.email} onChange={e => setStore({ ...store, email: e.target.value })} />
              {storeErrors.email && <p style={errorTextStyle}>{storeErrors.email}</p>}
            </div>
            <div>
              <label style={labelStyle}>Contact Phone</label>
              <input style={inputStyle} type="tel" value={store.phone} onChange={e => setStore({ ...store, phone: e.target.value })} />
              {storeErrors.phone && <p style={errorTextStyle}>{storeErrors.phone}</p>}
            </div>
            <div>
              <label style={labelStyle}>Store Address</label>
              <textarea rows={3} style={{ ...inputStyle, resize: 'vertical' }} value={store.address} onChange={e => setStore({ ...store, address: e.target.value })} />
              {storeErrors.address && <p style={errorTextStyle}>{storeErrors.address}</p>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button style={saveButtonStyle} onClick={handleSaveStore}>Save Changes</button>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div style={{ maxWidth: 600 }}>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Notification Preferences</h2>
            {notificationFields.map(({ key, label, description }) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 0', borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 500 }}>{label}</p>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{description}</p>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={notifications[key]}
                    onChange={e => {
                      const next = { ...notifications, [key]: e.target.checked };
                      setNotifications(next);
                      persist({ notifications: next });
                    }}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{ position: 'absolute', inset: 0, backgroundColor: notifications[key] ? 'var(--primary)' : 'var(--border-color)', borderRadius: '24px', transition: '0.2s' }}></span>
                </label>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'payments' && (
          <div style={{ maxWidth: 600 }}>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Payment Configuration</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <CreditCard size={32} color="var(--primary)" />
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>Stripe</p>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Credit/Debit Card Payments</p>
                  </div>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Stripe API keys are configured via the backend's environment variables
                (<code>STRIPE_SECRET_KEY</code>, <code>STRIPE_WEBHOOK_SECRET</code>) and are never
                entered or stored through this dashboard, since secret keys must not live in
                client-side storage.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'delivery' && (
          <div style={{ maxWidth: 600 }}>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Delivery Settings</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={labelStyle}>Free Delivery Minimum (₹)</label>
                <input style={inputStyle} type="number" value={delivery.freeDeliveryMin} onChange={e => setDelivery({ ...delivery, freeDeliveryMin: e.target.value })} />
                {deliveryErrors.freeDeliveryMin && <p style={errorTextStyle}>{deliveryErrors.freeDeliveryMin}</p>}
              </div>
              <div>
                <label style={labelStyle}>Standard Delivery Fee (₹)</label>
                <input style={inputStyle} type="number" value={delivery.deliveryFee} onChange={e => setDelivery({ ...delivery, deliveryFee: e.target.value })} />
                {deliveryErrors.deliveryFee && <p style={errorTextStyle}>{deliveryErrors.deliveryFee}</p>}
              </div>
              <div>
                <label style={labelStyle}>Estimated Delivery Time</label>
                <input style={inputStyle} value={delivery.estimatedTime} onChange={e => setDelivery({ ...delivery, estimatedTime: e.target.value })} />
                {deliveryErrors.estimatedTime && <p style={errorTextStyle}>{deliveryErrors.estimatedTime}</p>}
              </div>
              <div>
                <label style={labelStyle}>Serviceable Pincodes (comma separated)</label>
                <textarea rows={4} style={{ ...inputStyle, resize: 'vertical' }} value={delivery.pincodes} onChange={e => setDelivery({ ...delivery, pincodes: e.target.value })} />
                {deliveryErrors.pincodes && <p style={errorTextStyle}>{deliveryErrors.pincodes}</p>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button style={saveButtonStyle} onClick={handleSaveDelivery}>Save Settings</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
