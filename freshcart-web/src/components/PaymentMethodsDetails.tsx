'use client';

import { useEffect, useState } from 'react';
import { CreditCard, Smartphone, Star, Trash2, Wallet } from 'lucide-react';
import {
  addPaymentMethod,
  getPaymentMethods,
  removePaymentMethod,
  setDefaultPaymentMethod,
  type PaymentMethod,
} from '../lib/api';
import { useToast } from './ToastProvider';
import { AccountCard } from './AccountCard';
import { AccountButton } from './AccountButton';
import { EmptyState, Skeleton } from './Skeleton';

const TYPE_OPTIONS: { value: PaymentMethod['type']; label: string; icon: typeof CreditCard; placeholder: string }[] = [
  { value: 'card', label: 'Card', icon: CreditCard, placeholder: 'Visa •••• 4242' },
  { value: 'upi', label: 'UPI', icon: Smartphone, placeholder: 'yourname@upi' },
  { value: 'wallet', label: 'Wallet', icon: Wallet, placeholder: 'Paytm Wallet' },
];

const fieldStyle = {
  width: '100%',
  padding: '0.7rem 0.8rem',
  border: '1px solid var(--acc-field-border, var(--border-color))',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--layer-0)',
  color: 'var(--text-primary)',
  fontSize: '0.95rem',
};

export function PaymentMethodsDetails() {
  const { showToast } = useToast();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<PaymentMethod['type']>('card');
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    getPaymentMethods()
      .then(setMethods)
      .catch((err) => showToast(err instanceof Error ? err.message : 'Failed to load payment methods.', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!value.trim()) return;
    setSaving(true);
    try {
      await addPaymentMethod({ type, masked_display_value: value.trim(), is_default: methods.length === 0 });
      setValue('');
      showToast('Payment method added.', 'success');
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add payment method.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultPaymentMethod(id);
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to set default.', 'error');
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removePaymentMethod(id);
      showToast('Payment method removed.', 'success');
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to remove.', 'error');
    }
  };

  const activeOption = TYPE_OPTIONS.find((o) => o.value === type)!;

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      <AccountCard style={{ display: 'grid', gap: '0.9rem' }}>
        <form onSubmit={handleAdd} style={{ display: 'grid', gap: '0.9rem' }}>
          <h2 style={{ margin: 0, fontSize: 'var(--acc-text-section-title-size, 1.05rem)', fontWeight: 700 }}>Add Payment Method</h2>
          <p style={{ margin: '-0.4rem 0 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
            For cards, enter only the last 4 digits and brand — never a full card number.
          </p>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.5rem 0.9rem', borderRadius: 'var(--radius-full)',
                  border: type === opt.value ? '1px solid var(--accent)' : '1px solid var(--border-color)',
                  background: type === opt.value ? 'var(--primary-light)' : 'transparent',
                  color: type === opt.value ? 'var(--accent)' : 'var(--text-secondary)',
                  fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                }}
              >
                <opt.icon size={14} /> {opt.label}
              </button>
            ))}
          </div>

          <label style={{ display: 'grid', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 700 }}>
            {type === 'card' ? 'Card label (brand + last 4 digits)' : type === 'upi' ? 'UPI ID' : 'Wallet label'}
            <input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={activeOption.placeholder}
              style={fieldStyle}
            />
          </label>

          <AccountButton type="submit" variant="primary" disabled={saving || !value.trim()} style={{ justifySelf: 'start' }}>
            {saving ? 'Adding...' : 'Add Payment Method'}
          </AccountButton>
        </form>
      </AccountCard>

      <section>
        <h2 style={{ margin: '0 0 0.75rem', fontSize: 'var(--acc-text-section-title-size, 1.05rem)', fontWeight: 700 }}>
          Saved Payment Methods
        </h2>
        {loading ? (
          <div style={{ display: 'grid', gap: '0.7rem' }}>
            {[0, 1].map((i) => (
              <div key={i} style={{ padding: '0.95rem', border: 'var(--acc-card-border, 1px solid var(--border-color))', borderRadius: 'var(--acc-card-radius, var(--radius-sm))' }}>
                <Skeleton style={{ width: '40%', height: '1rem' }} />
              </div>
            ))}
          </div>
        ) : methods.length === 0 ? (
          <EmptyState
            icon={<CreditCard size={24} />}
            heading="No saved payment methods"
            subtext="Add a card, UPI ID, or wallet above for faster checkout."
          />
        ) : (
          <div style={{ display: 'grid', gap: '0.7rem' }}>
            {methods.map((method) => {
              const option = TYPE_OPTIONS.find((o) => o.value === method.type) || TYPE_OPTIONS[0];
              return (
                <AccountCard key={method.id} hoverable style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'var(--primary-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <option.icon size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)', overflowWrap: 'anywhere' }}>{method.masked_display_value}</p>
                    <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{method.type}</p>
                  </div>
                  {method.is_default && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.15rem 0.55rem', borderRadius: 'var(--radius-full)', background: 'var(--primary-light)', color: 'var(--accent)', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                      <Star size={11} fill="currentColor" /> Default
                    </span>
                  )}
                  <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                    {!method.is_default && (
                      <AccountButton compact variant="secondary" onClick={() => handleSetDefault(method.id)}>
                        Set default
                      </AccountButton>
                    )}
                    <AccountButton compact variant="danger" onClick={() => handleRemove(method.id)} leftIcon={<Trash2 size={13} />}>
                      Remove
                    </AccountButton>
                  </div>
                </AccountCard>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
