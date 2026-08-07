'use client';

import { useEffect, useState } from 'react';
import { Banknote, Check, CreditCard, Lock, Pencil, Smartphone, Star, Trash2, Wallet } from 'lucide-react';
import {
  addPaymentMethod,
  getPaymentMethods,
  removePaymentMethod,
  setDefaultPaymentMethod,
  updatePaymentMethod,
  type PaymentMethod,
} from '../lib/api';
import { supabase } from '../lib/supabase';
import { useToast } from './ToastProvider';
import { AccountCard } from './AccountCard';
import { AccountButton } from './AccountButton';
import { EmptyState, Skeleton } from './Skeleton';
import styles from './PaymentMethodsDetails.module.css';

interface BrandOption {
  key: string;
  label: string;
  color: string;
  detect?: (digits: string) => boolean;
}

const TYPE_OPTIONS: { value: PaymentMethod['type']; label: string; icon: typeof CreditCard }[] = [
  { value: 'card', label: 'Card', icon: CreditCard },
  { value: 'upi', label: 'UPI', icon: Smartphone },
  { value: 'wallet', label: 'Wallet', icon: Wallet },
];

// Matches VALID_PAYMENT_METHODS in checkout/page.tsx, which reads this same
// profiles.preferred_payment column to preselect a method at checkout.
//
// Net Banking is deliberately absent here: it's a valid checkout-time category
// but the "Add Payment Method" section below has no corresponding flow to save
// a net-banking instrument (no bank-selection UI, no payment_methods 'netbanking'
// type). Re-add the tile only once that Add flow exists — otherwise it renders
// as selectable with nothing to configure.
const PREFERRED_PAYMENT_OPTIONS: { value: string; label: string; icon: typeof CreditCard }[] = [
  { value: 'cod', label: 'Cash on Delivery', icon: Banknote },
  { value: 'upi', label: 'UPI', icon: Smartphone },
  { value: 'card', label: 'Card', icon: CreditCard },
];

const UPI_ID_PATTERN = /^[\w.-]+@[\w]+$/;

const TRUST_COPY: Record<PaymentMethod['type'], string> = {
  card: 'Encrypted in transit — we only store the last 4 digits and brand, never the full card number.',
  upi: 'Encrypted in transit — we store your UPI ID only, never your bank credentials.',
  wallet: 'Encrypted in transit — we store only your linked wallet provider and label.',
};

// Simple neutral BIN-prefix ranges — visual reference only, not a real card validator.
const CARD_BRANDS: BrandOption[] = [
  { key: 'visa', label: 'Visa', color: '#1A56DB', detect: (d) => /^4/.test(d) },
  { key: 'mastercard', label: 'Mastercard', color: '#D6293E', detect: (d) => /^5[1-5]|^2[2-7]/.test(d) },
  { key: 'rupay', label: 'RuPay', color: '#0B6E4F', detect: (d) => /^60|^65|^81|^82|^508/.test(d) },
];

const WALLET_PROVIDERS: BrandOption[] = [
  { key: 'paytm', label: 'Paytm', color: '#00B9F1' },
  { key: 'phonepe', label: 'PhonePe', color: '#5F259F' },
  { key: 'amazonpay', label: 'Amazon Pay', color: '#FF9900' },
  { key: 'other', label: 'Other', color: '#64748B' },
];

const brandVar = (color: string) => ({ '--brand-color': color }) as React.CSSProperties;

export function PaymentMethodsDetails() {
  const { showToast } = useToast();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<PaymentMethod['type']>('card');
  const [value, setValue] = useState('');
  const [cardProvider, setCardProvider] = useState<string | null>(null);
  const [walletProvider, setWalletProvider] = useState<string | null>(null);
  const [upiTouched, setUpiTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [preferredPayment, setPreferredPayment] = useState('cod');
  const [savingPreferred, setSavingPreferred] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editSaving, setEditSaving] = useState(false);

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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setUserId(data.user.id);
      supabase
        .from('profiles')
        .select('preferred_payment')
        .eq('id', data.user.id)
        .maybeSingle()
        .then(({ data: profile }) => {
          if (profile?.preferred_payment) setPreferredPayment(profile.preferred_payment);
        });
    });
  }, []);

  const handleSetPreferred = async (nextValue: string) => {
    if (!userId || savingPreferred || nextValue === preferredPayment) return;
    const previous = preferredPayment;
    setPreferredPayment(nextValue);
    setSavingPreferred(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_payment: nextValue, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (error) throw error;
      showToast('Preferred payment updated.', 'success');
    } catch (err) {
      setPreferredPayment(previous);
      showToast(err instanceof Error ? err.message : 'Failed to update preferred payment.', 'error');
    } finally {
      setSavingPreferred(false);
    }
  };

  const handleCardValueChange = (raw: string) => {
    setValue(raw);
    const digits = raw.replace(/\D/g, '');
    if (!digits) return;
    const detected = CARD_BRANDS.find((b) => b.detect?.(digits));
    if (detected) setCardProvider(detected.key);
  };

  const selectWallet = (wallet: BrandOption) => {
    setWalletProvider(wallet.key);
    setValue(`${wallet.label} Wallet`);
  };

  // Changing the Add-method type is intentionally independent of the Preferred
  // Payment tiles above: Preferred Payment only sets the checkout default, while
  // this section adds a new saved instrument of whichever type the pill toggle
  // is on. Selecting "Card" as preferred should not force-switch this form to
  // Card (a user may prefer Card at checkout while still wanting to save a new
  // UPI ID here) — do not link these two controls.
  const changeType = (nextType: PaymentMethod['type']) => {
    setType(nextType);
    setValue('');
    setCardProvider(null);
    setWalletProvider(null);
    setUpiTouched(false);
  };

  const isUpiValid = UPI_ID_PATTERN.test(value.trim());
  const showUpiError = type === 'upi' && upiTouched && value.trim().length > 0 && !isUpiValid;

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!value.trim()) return;
    if (type === 'upi') {
      setUpiTouched(true);
      if (!isUpiValid) return;
    }
    setSaving(true);
    try {
      const provider = type === 'card' ? cardProvider : type === 'wallet' ? walletProvider : null;
      await addPaymentMethod({ type, masked_display_value: value.trim(), provider, is_default: methods.length === 0 });
      setValue('');
      setCardProvider(null);
      setWalletProvider(null);
      setUpiTouched(false);
      showToast('Payment method added.', 'success');
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add payment method.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (method: PaymentMethod) => {
    try {
      await setDefaultPaymentMethod(method.id);
      load();
      // Best-effort: keep checkout's preselected category in sync with the newly
      // default saved instrument. Wallet has no equivalent checkout category, so
      // preferred_payment is left as-is in that case.
      if (userId && (method.type === 'card' || method.type === 'upi')) {
        setPreferredPayment(method.type);
        try {
          await supabase
            .from('profiles')
            .update({ preferred_payment: method.type, updated_at: new Date().toISOString() })
            .eq('id', userId);
        } catch {
          // non-critical sync, ignore
        }
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to set default.', 'error');
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removePaymentMethod(id);
      if (editingId === id) setEditingId(null);
      showToast('Payment method removed.', 'success');
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to remove.', 'error');
    }
  };

  const startEdit = (method: PaymentMethod) => {
    setEditingId(method.id);
    setEditValue(method.masked_display_value);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleSaveEdit = async (id: string) => {
    if (!editValue.trim()) return;
    setEditSaving(true);
    try {
      await updatePaymentMethod(id, { masked_display_value: editValue.trim() });
      showToast('Payment method updated.', 'success');
      setEditingId(null);
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update payment method.', 'error');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      {!loading && methods.length === 0 && (
        <AccountCard style={{ display: 'grid', gap: '0.9rem' }}>
          <h2 style={{ margin: 0, fontSize: 'var(--acc-text-section-title-size, 1.05rem)', fontWeight: 700 }}>Preferred Payment</h2>
          <p style={{ margin: '-0.4rem 0 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
            Pre-selected at checkout — you can always change it per order.
          </p>

          <div className={styles.tileGrid}>
            {PREFERRED_PAYMENT_OPTIONS.map((opt) => {
              const selected = preferredPayment === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={!userId || savingPreferred}
                  className={`${styles.tile} ${selected ? styles.tileSelected : ''}`}
                  onClick={() => handleSetPreferred(opt.value)}
                >
                  {selected && (
                    <span className={styles.tileCheck}>
                      <Check size={10} />
                    </span>
                  )}
                  <span className={styles.tileIcon}>
                    <opt.icon size={18} />
                  </span>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </AccountCard>
      )}

      <AccountCard style={{ display: 'grid', gap: '0.9rem' }}>
        <form onSubmit={handleAdd} style={{ display: 'grid', gap: '0.9rem' }}>
          <h2 style={{ margin: 0, fontSize: 'var(--acc-text-section-title-size, 1.05rem)', fontWeight: 700 }}>Add Payment Method</h2>
          <p style={{ margin: '-0.4rem 0 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
            For cards, enter only the last 4 digits and brand — never a full card number.
          </p>

          <div className={styles.pillRow}>
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => changeType(opt.value)}
                className={`${styles.pill} ${type === opt.value ? styles.pillActive : ''}`}
              >
                <opt.icon size={14} /> {opt.label}
              </button>
            ))}
          </div>

          {type === 'card' && (
            <>
              <label className={styles.field}>
                Card label (brand + last 4 digits)
                <input
                  className={styles.input}
                  value={value}
                  onChange={(event) => handleCardValueChange(event.target.value)}
                  placeholder="Visa •••• 4242"
                />
              </label>
              <div className={styles.brandRow}>
                {CARD_BRANDS.map((brand) => (
                  <button
                    key={brand.key}
                    type="button"
                    style={brandVar(brand.color)}
                    className={`${styles.brandChip} ${cardProvider === brand.key ? styles.brandChipActive : ''}`}
                    onClick={() => setCardProvider(brand.key)}
                  >
                    <span className={styles.brandDot} /> {brand.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {type === 'upi' && (
            <>
              <div className={styles.inputRow}>
                <label className={styles.field} style={{ flex: 1 }}>
                  UPI ID
                  <input
                    className={styles.input}
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    onBlur={() => setUpiTouched(true)}
                    placeholder="yourname@bank"
                    aria-invalid={showUpiError}
                  />
                </label>
                <AccountButton
                  type="button"
                  variant="secondary"
                  compact
                  disabled
                  title="UPI app verification is coming soon — enter your UPI ID manually for now."
                  style={{ marginTop: '1.3rem' }}
                >
                  Verify via UPI app (coming soon)
                </AccountButton>
              </div>
              {showUpiError && (
                <p style={{ margin: '-0.5rem 0 0', color: '#EF4444', fontSize: '0.78rem' }}>
                  Enter a valid UPI ID, e.g. yourname@bank.
                </p>
              )}
            </>
          )}

          {type === 'wallet' && (
            <div className={styles.field}>
              Wallet provider
              <div className={styles.tileGrid}>
                {WALLET_PROVIDERS.map((wallet) => {
                  const selected = walletProvider === wallet.key;
                  return (
                    <button
                      key={wallet.key}
                      type="button"
                      style={brandVar(wallet.color)}
                      className={`${styles.tile} ${selected ? styles.tileSelected : ''}`}
                      onClick={() => selectWallet(wallet)}
                    >
                      {selected && (
                        <span className={styles.tileCheck}>
                          <Check size={10} />
                        </span>
                      )}
                      <span className={styles.tileIcon}>
                        <Wallet size={18} />
                      </span>
                      {wallet.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <p className={styles.trustRow}>
            <Lock size={12} /> {TRUST_COPY[type]}
          </p>

          <AccountButton
            type="submit"
            variant="primary"
            disabled={saving || !value.trim() || (type === 'upi' && !isUpiValid)}
            style={{ justifySelf: 'start' }}
          >
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
              const brandList = method.type === 'card' ? CARD_BRANDS : method.type === 'wallet' ? WALLET_PROVIDERS : [];
              const brand = brandList.find((b) => b.key === method.provider);
              const isEditing = editingId === method.id;

              return (
                <AccountCard key={method.id} hoverable={!isEditing} style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                  {isEditing ? (
                    <div className={styles.editRow}>
                      <input
                        className={styles.input}
                        value={editValue}
                        onChange={(event) => setEditValue(event.target.value)}
                        autoFocus
                      />
                      <AccountButton
                        compact
                        variant="primary"
                        disabled={editSaving || !editValue.trim()}
                        onClick={() => handleSaveEdit(method.id)}
                      >
                        {editSaving ? 'Saving...' : 'Save'}
                      </AccountButton>
                      <AccountButton compact variant="secondary" onClick={cancelEdit}>
                        Cancel
                      </AccountButton>
                    </div>
                  ) : (
                    <>
                      <div
                        className={styles.savedIcon}
                        style={brand ? { ...brandVar(brand.color), background: `color-mix(in srgb, ${brand.color} 14%, transparent)`, color: brand.color } : undefined}
                      >
                        {brand ? brand.label.slice(0, 2).toUpperCase() : <option.icon size={18} />}
                      </div>
                      <div className={styles.savedBody}>
                        <p className={styles.savedLabel}>{method.masked_display_value}</p>
                        <p className={styles.savedMeta}>{method.type}</p>
                      </div>
                      {method.is_default && (
                        <span className={styles.defaultBadge}>
                          <Star size={11} fill="currentColor" /> Default
                        </span>
                      )}
                      <div className={styles.savedActions}>
                        {!method.is_default && (
                          <AccountButton compact variant="secondary" onClick={() => handleSetDefault(method)}>
                            Set default
                          </AccountButton>
                        )}
                        <button type="button" className={styles.iconBtn} aria-label="Edit payment method" onClick={() => startEdit(method)}>
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                          aria-label="Remove payment method"
                          onClick={() => handleRemove(method.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </AccountCard>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
