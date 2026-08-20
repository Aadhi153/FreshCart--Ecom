'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Briefcase, CheckCircle2, Home, LocateFixed, MapPin, Star, XCircle } from 'lucide-react';
import { addAddress, getAddresses, removeAddress, setDefaultAddress, updateAddress, type Address, type AddressType } from '../lib/api';
import { EmptyState, Skeleton } from './Skeleton';
import { ToggleSwitch } from './ToggleSwitch';
import { AccountCard } from './AccountCard';
import { AccountButton } from './AccountButton';
import { useToast } from './ToastProvider';
import { getCurrentPosition, reverseGeocode, geocodeAddress, isWithinDeliveryZone } from '../lib/serviceability';
import styles from './AddressDetails.module.css';

interface EditableAddress {
  id: string;
  label: string;
  type: AddressType;
  full_name: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

const emptyAddress: EditableAddress = {
  id: '',
  label: '',
  type: 'home',
  full_name: '',
  phone: '',
  line1: '',
  city: '',
  state: '',
  pincode: '',
  is_default: false,
};

type ZoneStatus = 'unknown' | 'checking' | 'ok' | 'fail';

const PHONE_REGEX = /^\d{10}$/;
const PINCODE_REGEX = /^\d{6}$/;

const TYPE_OPTIONS: { value: AddressType; label: string; icon: typeof Home }[] = [
  { value: 'home', label: 'Home', icon: Home },
  { value: 'work', label: 'Work', icon: Briefcase },
  { value: 'other', label: 'Other', icon: MapPin },
];

export function AddressDetails() {
  const { showToast } = useToast();
  const reduceMotion = useReducedMotion();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<EditableAddress>(emptyAddress);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<{ phone?: string; pincode?: string }>({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [zoneStatus, setZoneStatus] = useState<ZoneStatus>('unknown');

  const load = () => {
    getAddresses()
      .then(setAddresses)
      .catch((err) => showToast(err instanceof Error ? err.message : 'Failed to load addresses.', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateEditingField = (patch: Partial<EditableAddress>) => {
    setEditing((prev) => ({ ...prev, ...patch }));
    setZoneStatus('unknown');
  };

  const handleUseLocation = async () => {
    setLocating(true);
    setLocationError('');
    try {
      const position = await getCurrentPosition();
      const { latitude, longitude } = position.coords;
      const geo = await reverseGeocode(latitude, longitude);
      setEditing((prev) => ({
        ...prev,
        latitude,
        longitude,
        line1: geo?.line1 || prev.line1,
        city: geo?.city || prev.city,
        state: geo?.state || prev.state,
        pincode: geo?.pincode || prev.pincode,
      }));
      setZoneStatus(isWithinDeliveryZone(latitude, longitude) ? 'ok' : 'fail');
    } catch (err) {
      setLocationError(err instanceof Error ? err.message : 'Could not determine your location.');
    } finally {
      setLocating(false);
    }
  };

  const handleCheckAvailability = async () => {
    setZoneStatus('checking');
    setLocationError('');
    try {
      let lat = editing.latitude;
      let lng = editing.longitude;
      if (!lat || !lng) {
        const query = [editing.line1, editing.city, editing.state, editing.pincode].filter(Boolean).join(', ');
        const geo = await geocodeAddress(query);
        if (!geo) {
          setZoneStatus('unknown');
          setLocationError("Couldn't verify delivery availability for this address — we'll confirm at checkout.");
          return;
        }
        lat = geo.lat;
        lng = geo.lng;
      }
      setZoneStatus(isWithinDeliveryZone(lat, lng) ? 'ok' : 'fail');
    } catch {
      setZoneStatus('unknown');
      setLocationError("Couldn't verify delivery availability right now.");
    }
  };

  const saveAddress = async (event: React.FormEvent<HTMLFormElement>) => {
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
    setSaving(true);
    try {
      const payload = {
        label: editing.label,
        type: editing.type,
        full_name: editing.full_name,
        phone,
        line1: editing.line1,
        city: editing.city,
        state: editing.state,
        pincode,
        latitude: editing.latitude ?? null,
        longitude: editing.longitude ?? null,
        is_default: editing.is_default,
      };
      if (editing.id) {
        await updateAddress(editing.id, payload);
      } else {
        await addAddress(payload);
      }
      setMessage('Address saved.');
      showToast('Address saved.', 'success');
      setEditing(emptyAddress);
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save address.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (address: Address) => {
    setEditing({
      id: address.id,
      label: address.label || '',
      type: address.type,
      full_name: address.full_name,
      phone: address.phone,
      line1: address.line1,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      is_default: address.is_default,
      latitude: address.latitude,
      longitude: address.longitude,
    });
    setMessage('');
    setErrors({});
    setConfirmingId(null);
    setZoneStatus('unknown');
    setLocationError('');
  };

  const startNew = () => {
    setEditing(emptyAddress);
    setMessage('');
    setErrors({});
    setZoneStatus('unknown');
    setLocationError('');
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultAddress(id);
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to set default.', 'error');
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeAddress(id);
      setConfirmingId(null);
      if (editing.id === id) setEditing(emptyAddress);
      showToast('Address removed.', 'success');
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to remove address.', 'error');
    }
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

        <div className={styles.locationRow}>
          <AccountButton compact variant="secondary" onClick={handleUseLocation} disabled={locating} leftIcon={<LocateFixed size={15} />}>
            {locating ? 'Locating…' : 'Use my current location'}
          </AccountButton>
        </div>
        {locationError && <p className={styles.errorText}>{locationError}</p>}

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
        {editing.latitude != null && <p className={styles.attributionText}>Location data &copy; OpenStreetMap contributors</p>}

        <div className={styles.grid2}>
          <label className={styles.fieldLabel}>
            Address label
            <input value={editing.label} onChange={(event) => setEditing({ ...editing, label: event.target.value })} placeholder="e.g. Mom's house" className={styles.input} />
          </label>
          <label className={styles.fieldLabel}>
            Full name
            <input value={editing.full_name} onChange={(event) => setEditing({ ...editing, full_name: event.target.value })} placeholder="Full name" className={styles.input} />
          </label>
          <label className={styles.fieldLabel}>
            Phone number
            <input
              value={editing.phone}
              onChange={(event) => setEditing({ ...editing, phone: event.target.value })}
              placeholder="e.g. 9876543210"
              inputMode="numeric"
              className={`${styles.input} ${errors.phone ? styles.fieldError : ''}`}
            />
          </label>
        </div>
        {errors.phone && <p className={styles.errorText}>{errors.phone}</p>}

        <label className={styles.fieldLabel}>
          Address line
          <input value={editing.line1} onChange={(event) => updateEditingField({ line1: event.target.value })} placeholder="House number, street, area" className={styles.input} />
        </label>

        <div className={styles.grid3}>
          <label className={styles.fieldLabel}>
            City
            <input value={editing.city} onChange={(event) => updateEditingField({ city: event.target.value })} placeholder="City" className={styles.input} />
          </label>
          <label className={styles.fieldLabel}>
            State
            <input value={editing.state} onChange={(event) => updateEditingField({ state: event.target.value })} placeholder="State" className={styles.input} />
          </label>
          <label className={styles.fieldLabel}>
            Pincode
            <input
              value={editing.pincode}
              onChange={(event) => updateEditingField({ pincode: event.target.value })}
              placeholder="6-digit PIN"
              inputMode="numeric"
              className={`${styles.input} ${errors.pincode ? styles.fieldError : ''}`}
            />
          </label>
        </div>
        {errors.pincode && <p className={styles.errorText}>{errors.pincode}</p>}

        <div className={styles.locationRow}>
          <AccountButton
            compact
            variant="secondary"
            onClick={handleCheckAvailability}
            disabled={zoneStatus === 'checking' || !editing.line1}
          >
            {zoneStatus === 'checking' ? 'Checking…' : 'Check delivery availability'}
          </AccountButton>
        </div>
        {zoneStatus === 'ok' && (
          <motion.div
            className={`${styles.zoneBanner} ${styles.zoneBannerOk}`}
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
          >
            <CheckCircle2 size={16} /> We deliver here
          </motion.div>
        )}
        {zoneStatus === 'fail' && (
          <motion.div
            className={`${styles.zoneBanner} ${styles.zoneBannerFail}`}
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
          >
            <XCircle size={16} /> We don&apos;t currently deliver here — you&apos;ll be notified when we do
          </motion.div>
        )}

        <div className={styles.defaultToggleRow}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>Set as default address</span>
          <ToggleSwitch
            checked={Boolean(editing.is_default)}
            onChange={(checked) => setEditing({ ...editing, is_default: checked })}
            label="Toggle default address"
          />
        </div>

        {message && <p className={styles.message}>{message}</p>}

        <AccountButton type="submit" variant="primary" disabled={saving} style={{ justifySelf: 'start' }}>
          {saving ? 'Saving…' : zoneStatus === 'fail' ? 'Save Address Anyway' : 'Save Address'}
        </AccountButton>
      </form>

      {loading ? (
        <div style={{ display: 'grid', gap: '0.7rem' }}>
          {[0, 1].map((i) => (
            <div key={i} style={{ padding: '0.95rem', border: 'var(--acc-card-border, 1px solid var(--border-color))', borderRadius: 'var(--acc-card-radius, var(--radius-sm))' }}>
              <Skeleton style={{ width: '40%', height: '1rem' }} />
            </div>
          ))}
        </div>
      ) : addresses.length === 0 ? (
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
              <AccountCard
                key={address.id}
                hoverable
                accent={address.is_default ? 'default-highlight' : 'default'}
                className={`${styles.addressCard} ${address.is_default ? styles.cardDefault : ''}`}
              >
                <div className={styles.cardTop}>
                  <div className={styles.typeIcon}>
                    <TypeIcon size={16} />
                  </div>
                  <strong className={styles.cardLabel}>{address.label || address.type || 'Address'}</strong>
                  {address.is_default && (
                    <span className={styles.defaultBadge}>
                      <Star size={11} fill="currentColor" />
                      Default
                    </span>
                  )}
                </div>
                <p className={styles.cardText}>{address.full_name} &middot; {address.phone}</p>
                <p className={styles.cardText}>{address.line1}, {address.city}, {address.state} {address.pincode}</p>

                {isConfirming ? (
                  <div className={styles.confirmRow}>
                    <span className={styles.confirmText}>Remove this address?</span>
                    <AccountButton compact variant="danger-solid" onClick={() => handleRemove(address.id)}>
                      Yes, remove
                    </AccountButton>
                    <AccountButton compact variant="secondary" onClick={() => setConfirmingId(null)}>
                      Cancel
                    </AccountButton>
                  </div>
                ) : (
                  <div className={styles.cardActions}>
                    {!address.is_default && (
                      <AccountButton compact variant="secondary" onClick={() => handleSetDefault(address.id)}>
                        Set default
                      </AccountButton>
                    )}
                    <AccountButton compact variant="secondary" onClick={() => startEdit(address)}>
                      Edit
                    </AccountButton>
                    <AccountButton compact variant="danger" onClick={() => setConfirmingId(address.id)}>
                      Remove
                    </AccountButton>
                  </div>
                )}
              </AccountCard>
            );
          })}
        </section>
      )}
    </div>
  );
}
