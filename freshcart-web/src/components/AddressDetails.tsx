'use client';

import { useState } from 'react';
import { Briefcase, Home, MapPin, Star } from 'lucide-react';
import { useAddressStore, type AddressType, type SavedAddress } from '../lib/store';
import { EmptyState } from './Skeleton';
import { ToggleSwitch } from './ToggleSwitch';
import styles from './AddressDetails.module.css';

const emptyAddress: SavedAddress = {
  id: '',
  label: '',
  type: 'home',
  fullName: '',
  phone: '',
  line1: '',
  city: '',
  state: '',
  pincode: '',
  isDefault: false,
};

const PHONE_REGEX = /^\d{10}$/;
const PINCODE_REGEX = /^\d{6}$/;

const TYPE_OPTIONS: { value: AddressType; label: string; icon: typeof Home }[] = [
  { value: 'home', label: 'Home', icon: Home },
  { value: 'work', label: 'Work', icon: Briefcase },
  { value: 'other', label: 'Other', icon: MapPin },
];

export function AddressDetails() {
  const { addresses, upsertAddress, removeAddress, setDefaultAddress } = useAddressStore();
  const [editing, setEditing] = useState<SavedAddress>(addresses[0] || emptyAddress);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<{ phone?: string; pincode?: string }>({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const saveAddress = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const phone = editing.phone.trim();
    const pincode = editing.pincode.trim();
    const nextErrors: { phone?: string; pincode?: string } = {};
    if (phone && !PHONE_REGEX.test(phone)) {
      nextErrors.phone = 'Enter a valid 10-digit phone number.';
    }
    if (pincode && !PINCODE_REGEX.test(pincode)) {
      nextErrors.pincode = 'Enter a valid 6-digit PIN code.';
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setMessage('');
      return;
    }

    setErrors({});
    upsertAddress({ ...editing, phone, pincode, id: editing.id || crypto.randomUUID() });
    setMessage('Address saved.');
  };

  const startEdit = (address: SavedAddress) => {
    setEditing(address);
    setMessage('');
    setErrors({});
    setConfirmingId(null);
  };

  const startNew = () => {
    setEditing(emptyAddress);
    setMessage('');
    setErrors({});
  };

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <form onSubmit={saveAddress} className={styles.formCard}>
        <div className={styles.formHeader}>
          <h2 style={{ margin: 0, fontSize: '1.05rem' }}>{editing.id ? 'Edit Delivery Address' : 'Add Delivery Address'}</h2>
          {editing.id && (
            <button type="button" onClick={startNew} className={styles.linkButton}>
              + Add new address
            </button>
          )}
        </div>

        <div className={styles.typeRow}>
          {TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setEditing({ ...editing, type: value })}
              className={`${styles.typeChip} ${editing.type === value ? styles.typeChipActive : ''}`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        <div className={styles.grid2}>
          <input value={editing.label} onChange={(event) => setEditing({ ...editing, label: event.target.value })} placeholder="Address label (e.g. Mom's house)" className={styles.field} />
          <input value={editing.fullName} onChange={(event) => setEditing({ ...editing, fullName: event.target.value })} placeholder="Full name" className={styles.field} />
          <div>
            <input
              value={editing.phone}
              onChange={(event) => setEditing({ ...editing, phone: event.target.value })}
              placeholder="Phone number"
              inputMode="numeric"
              className={`${styles.field} ${errors.phone ? styles.fieldError : ''}`}
            />
          </div>
        </div>
        {errors.phone && <p className={styles.errorText}>{errors.phone}</p>}

        <input value={editing.line1} onChange={(event) => setEditing({ ...editing, line1: event.target.value })} placeholder="House number, street, area" className={styles.field} />

        <div className={styles.grid3}>
          <input value={editing.city} onChange={(event) => setEditing({ ...editing, city: event.target.value })} placeholder="City" className={styles.field} />
          <input value={editing.state} onChange={(event) => setEditing({ ...editing, state: event.target.value })} placeholder="State" className={styles.field} />
          <input
            value={editing.pincode}
            onChange={(event) => setEditing({ ...editing, pincode: event.target.value })}
            placeholder="PIN code"
            inputMode="numeric"
            className={`${styles.field} ${errors.pincode ? styles.fieldError : ''}`}
          />
        </div>
        {errors.pincode && <p className={styles.errorText}>{errors.pincode}</p>}

        <div className={styles.defaultToggleRow}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>Set as default address</span>
          <ToggleSwitch
            checked={Boolean(editing.isDefault)}
            onChange={(checked) => setEditing({ ...editing, isDefault: checked })}
            label="Toggle default address"
          />
        </div>

        {message && <p className={styles.message}>{message}</p>}

        <button type="submit" className={styles.submitButton}>
          Save Address
        </button>
      </form>

      {addresses.length === 0 ? (
        <EmptyState
          icon={<MapPin size={24} />}
          heading="No saved address yet"
          subtext="Add a delivery address above for faster checkout."
        />
      ) : (
        <section className={styles.cardGrid}>
          {addresses.map((address) => {
            const TypeIcon = TYPE_OPTIONS.find((t) => t.value === address.type)?.icon || MapPin;
            const isConfirming = confirmingId === address.id;

            return (
              <article key={address.id} className={`${styles.card} ${address.isDefault ? styles.cardDefault : ''}`}>
                <div className={styles.cardTop}>
                  <div className={styles.typeIcon}>
                    <TypeIcon size={16} />
                  </div>
                  <strong className={styles.cardLabel}>{address.label || address.type || 'Address'}</strong>
                  {address.isDefault && (
                    <span className={styles.defaultBadge}>
                      <Star size={11} fill="currentColor" />
                      Default
                    </span>
                  )}
                </div>
                <p className={styles.cardText}>{address.fullName} &middot; {address.phone}</p>
                <p className={styles.cardText}>{address.line1}, {address.city}, {address.state} {address.pincode}</p>

                {isConfirming ? (
                  <div className={styles.confirmRow}>
                    <span className={styles.confirmText}>Remove this address?</span>
                    <button type="button" onClick={() => { removeAddress(address.id); setConfirmingId(null); }} className={`${styles.actionButton} ${styles.actionButtonDanger}`}>
                      Yes, remove
                    </button>
                    <button type="button" onClick={() => setConfirmingId(null)} className={styles.actionButton}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className={styles.cardActions}>
                    {!address.isDefault && (
                      <button type="button" onClick={() => setDefaultAddress(address.id)} className={styles.actionButton}>
                        Set default
                      </button>
                    )}
                    <button type="button" onClick={() => startEdit(address)} className={styles.actionButton}>
                      Edit
                    </button>
                    <button type="button" onClick={() => setConfirmingId(address.id)} className={`${styles.actionButton} ${styles.actionButtonDanger}`}>
                      Remove
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
