'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  Check,
  CheckCircle2,
  Home,
  Landmark,
  Lock,
  Mail,
  MapPin,
  Plus,
  ShieldCheck,
  Smartphone,
  Tag,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { placeOrder as placeOrderApi } from '../../lib/api';
import type { Session } from '@supabase/supabase-js';
import { useAddressStore, useCartStore, type AddressType, type SavedAddress } from '../../lib/store';
import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD } from '../../lib/constants';
import { CheckoutStepper } from '../../components/CheckoutStepper';
import { Confetti } from '../../components/Confetti';
import { useToast } from '../../components/ToastProvider';
import styles from './page.module.css';

const STEP_LABELS = [{ label: 'Login' }, { label: 'Address' }, { label: 'Summary' }, { label: 'Payment' }];

const TYPE_OPTIONS: { value: AddressType; label: string; icon: typeof Home }[] = [
  { value: 'home', label: 'Home', icon: Home },
  { value: 'work', label: 'Work', icon: Briefcase },
  { value: 'other', label: 'Other', icon: MapPin },
];

const AVAILABLE_OFFERS = ['FRESH10', 'NEWUSER'];

const UPI_APPS = ['GPay', 'PhonePe', 'Paytm'];
const BANKS = ['SBI', 'HDFC', 'ICICI', 'Axis'];
const VALID_PAYMENT_METHODS = ['cod', 'card', 'upi', 'netbanking'];

const emptyAddress = (): SavedAddress => ({
  id: crypto.randomUUID(),
  label: '',
  type: 'home',
  fullName: '',
  phone: '',
  line1: '',
  city: '',
  state: '',
  pincode: '',
});

function detectCardType(digits: string): string {
  if (digits.startsWith('4')) return 'VISA';
  if (/^5[1-5]/.test(digits)) return 'MASTERCARD';
  return '';
}

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function isExpiryValid(digits: string): boolean {
  if (digits.length !== 4) return false;
  const month = parseInt(digits.slice(0, 2), 10);
  const year = 2000 + parseInt(digits.slice(2), 10);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const expiry = new Date(year, month);
  return expiry > now;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { items, clearCart } = useCartStore();
  const addresses = useAddressStore((state) => state.addresses);
  const addressHasHydrated = useAddressStore((state) => state.hasHydrated);
  const upsertAddress = useAddressStore((state) => state.upsertAddress);

  const [session, setSession] = useState<Session | null>(null);
  const [placing, setPlacing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [error, setError] = useState('');

  const [activeStep, setActiveStep] = useState(1);
  const activeStepRef = useRef(activeStep);
  useEffect(() => {
    activeStepRef.current = activeStep;
  }, [activeStep]);

  // ── Auth ──────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) setActiveStep(2);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession && activeStepRef.current === 1) {
        setActiveStep(2);
        showToast('Logged in successfully.', 'success');
      } else if (!nextSession) {
        setActiveStep(1);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [showToast]);

  useEffect(() => {
    if (!session) return;
    supabase
      .from('profiles')
      .select('preferred_payment')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.preferred_payment && VALID_PAYMENT_METHODS.includes(data.preferred_payment)) {
          setPaymentMethod(data.preferred_payment);
        }
      });
  }, [session]);

  // ── Address ───────────────────────────────────────────────────────────
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState<SavedAddress>(emptyAddress());
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});
  const [shakeForm, setShakeForm] = useState(false);
  const pincodeLookupRef = useRef('');

  // Address store hydrates from localStorage asynchronously after first render, so the
  // saved-address-vs-new-address-form decision has to wait for that flag instead of the
  // (still-empty) addresses array available on mount.
  useEffect(() => {
    if (!addressHasHydrated) return;
    const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0];
    setSelectedAddressId(defaultAddress?.id || '');
    setShowAddressForm(addresses.length === 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressHasHydrated]);

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

  useEffect(() => {
    const pincode = newAddress.pincode.trim();
    if (pincode.length !== 6 || !/^\d{6}$/.test(pincode) || pincodeLookupRef.current === pincode) return;
    pincodeLookupRef.current = pincode;
    fetch(`https://api.postalpincode.in/pincode/${pincode}`)
      .then((res) => res.json())
      .then((data) => {
        const po = data?.[0]?.PostOffice?.[0];
        if (po) {
          setNewAddress((prev) =>
            prev.pincode === pincode ? { ...prev, city: prev.city || po.District, state: prev.state || po.State } : prev
          );
        }
      })
      .catch(() => {});
  }, [newAddress.pincode]);

  const validateNewAddress = () => {
    const errs: Record<string, string> = {};
    if (!newAddress.fullName.trim()) errs.fullName = 'Name is required.';
    if (!/^\d{10}$/.test(newAddress.phone.trim())) errs.phone = 'Enter a valid 10-digit number.';
    if (!newAddress.line1.trim()) errs.line1 = 'Address is required.';
    if (!/^\d{6}$/.test(newAddress.pincode.trim())) errs.pincode = 'Enter a valid 6-digit PIN code.';
    if (!newAddress.city.trim()) errs.city = 'City is required.';
    if (!newAddress.state.trim()) errs.state = 'State is required.';
    return errs;
  };

  const handleDeliverHere = () => {
    if (showAddressForm) {
      const errs = validateNewAddress();
      if (Object.keys(errs).length > 0) {
        setAddressErrors(errs);
        setShakeForm(true);
        setTimeout(() => setShakeForm(false), 400);
        return;
      }
      setAddressErrors({});
      upsertAddress(newAddress);
      setSelectedAddressId(newAddress.id);
      setShowAddressForm(false);
      setError('');
      setActiveStep(3);
      showToast('Delivery address saved.', 'success');
      return;
    }

    if (!selectedAddress) {
      setError('Please select or add a delivery address.');
      return;
    }
    setError('');
    setActiveStep(3);
    showToast('Delivery address confirmed.', 'success');
  };

  // ── Order summary / coupon ───────────────────────────────────────────
  const subtotal = useMemo(() => items.reduce((acc, item) => acc + item.price * item.quantity, 0), [items]);
  const delivery = subtotal > 0 && subtotal < FREE_DELIVERY_THRESHOLD ? DELIVERY_FEE : 0;
  const amountToFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  const freeDeliveryProgress = Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100);

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount_type: string; discount_value: number; max_discount_amount: number | null; min_order_amount: number } | null>(null);
  const [couponError, setCouponError] = useState('');

  const handleApplyCoupon = async (codeOverride?: string) => {
    const code = (codeOverride ?? couponCode).trim().toUpperCase();
    setCouponError('');
    const { data, error: couponFetchError } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code)
      .eq('active', true)
      .maybeSingle();
    if (couponFetchError || !data) {
      setCouponError('Invalid or expired coupon code.');
      setAppliedCoupon(null);
      return;
    }
    if (subtotal < data.min_order_amount) {
      setCouponError(`Minimum order value ₹${data.min_order_amount} required.`);
      setAppliedCoupon(null);
      return;
    }
    setCouponCode(code);
    setAppliedCoupon(data);
  };

  const discount = appliedCoupon
    ? Math.min(
        appliedCoupon.discount_type === 'flat' ? appliedCoupon.discount_value : (subtotal * appliedCoupon.discount_value) / 100,
        appliedCoupon.max_discount_amount ?? Infinity,
        subtotal
      )
    : 0;
  const total = subtotal + delivery - discount;

  const handleSummarySubmit = () => {
    if (items.length === 0) {
      setError('Your cart is empty.');
      return;
    }
    setError('');
    setActiveStep(4);
    showToast('Order summary confirmed.', 'success');
  };

  // ── Payment ───────────────────────────────────────────────────────────
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [upiId, setUpiId] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const cardType = detectCardType(cardNumber.replace(/\D/g, ''));

  const validatePaymentDetails = (): string => {
    if (paymentMethod === 'card') {
      if (cardNumber.replace(/\D/g, '').length !== 16) return 'Enter a valid 16-digit card number.';
      if (!isExpiryValid(cardExpiry.replace(/\D/g, ''))) return 'Enter a valid, non-expired expiry date (MM/YY).';
      if (cardCvv.length !== 3) return 'Enter a valid 3-digit CVV.';
    } else if (paymentMethod === 'upi') {
      if (!/^[\w.-]+@[\w]+$/.test(upiId.trim())) return 'Enter a valid UPI ID (e.g. name@bank).';
    } else if (paymentMethod === 'netbanking') {
      if (!selectedBank) return 'Please select a bank.';
    }
    return '';
  };

  const placeOrder = async () => {
    if (items.length === 0) {
      setError('Your cart is empty.');
      return;
    }
    if (!selectedAddress) {
      setError('Please select a delivery address.');
      return;
    }
    const paymentError = validatePaymentDetails();
    if (paymentError) {
      setError(paymentError);
      return;
    }

    setError('');
    setPlacing(true);
    try {
      const order = await placeOrderApi({
        items: items.map((item) => ({ product_id: item.productId, quantity: item.quantity, price: item.price })),
        total_amount: total,
        delivery_address: selectedAddress,
        payment_method: paymentMethod,
        coupon_code: appliedCoupon?.code,
      });
      clearCart();
      setShowConfetti(true);
      showToast('Order placed successfully!', 'success');
      setTimeout(() => router.push(`/order-confirmation/${order.id}`), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order. Please try again.');
      setPlacing(false);
    }
  };

  const StepCard = ({
    stepNum,
    title,
    isCompleted,
    summary,
    onEdit,
    children,
  }: {
    stepNum: number;
    title: string;
    isCompleted: boolean;
    summary?: React.ReactNode;
    onEdit: () => void;
    children?: React.ReactNode;
  }) => {
    const isActive = activeStep === stepNum;
    return (
      <div className={styles.card}>
        <div
          className={`${styles.cardHeader} ${isActive ? styles.cardHeaderActive : ''}`}
          onClick={() => isCompleted && onEdit()}
        >
          <div className={styles.cardHeaderLeft}>
            <div
              className={`${styles.cardHeaderIcon} ${isCompleted ? styles.cardHeaderIconDone : ''} ${isActive ? styles.cardHeaderIconActive : ''}`}
            >
              {isCompleted ? <Check size={15} strokeWidth={3} /> : stepNum}
            </div>
            <div>
              <h2 className={styles.cardTitle}>{title}</h2>
              {isCompleted && summary && <p className={styles.cardSummary}>{summary}</p>}
            </div>
          </div>
          {isCompleted && !isActive && (
            <button
              type="button"
              className={styles.changeButton}
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              CHANGE
            </button>
          )}
        </div>
        {isActive && <div className={styles.cardBody}>{children}</div>}
      </div>
    );
  };

  return (
    <main className={styles.page}>
      <CheckoutStepper steps={STEP_LABELS} activeStep={activeStep} />

      <div className={styles.grid}>
        <div className={styles.stepsColumn}>
          {/* STEP 1: LOGIN */}
          <StepCard stepNum={1} title="LOGIN" isCompleted={!!session} summary={session && (
            <span>
              {session.user?.email}
              <span className={styles.verifiedBadge}><ShieldCheck size={11} /> Verified</span>
            </span>
          )} onEdit={() => router.push('/auth')}>
            {!session && (
              <div className={styles.loginPrompt}>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Please log in to proceed with checkout.</p>
                <button type="button" className={styles.loginButton} onClick={() => router.push('/auth')}>
                  Login or Signup
                </button>
              </div>
            )}
          </StepCard>

          {/* STEP 2: ADDRESS */}
          <StepCard
            stepNum={2}
            title="DELIVERY ADDRESS"
            isCompleted={activeStep > 2}
            summary={selectedAddress ? `${selectedAddress.fullName}, ${selectedAddress.line1}, ${selectedAddress.city} - ${selectedAddress.pincode}` : ''}
            onEdit={() => setActiveStep(2)}
          >
            {!showAddressForm && (
              <>
                <div className={styles.addressGrid}>
                  {addresses.map((addr) => {
                    const TypeIcon = TYPE_OPTIONS.find((t) => t.value === addr.type)?.icon || MapPin;
                    const isSelected = selectedAddressId === addr.id;
                    return (
                      <div
                        key={addr.id}
                        className={`${styles.addressCard} ${isSelected ? styles.addressCardSelected : ''}`}
                        onClick={() => setSelectedAddressId(addr.id)}
                      >
                        <span className={`${styles.addressRadio} ${isSelected ? styles.addressRadioSelected : ''}`} />
                        <div className={styles.addressCardTop}>
                          <span className={styles.addressTypeBadge}><TypeIcon size={13} /></span>
                          <span className={styles.addressLabel}>{addr.label || addr.type || 'Address'}</span>
                          {addr.isDefault && <span className={styles.defaultTag}>Default</span>}
                        </div>
                        <p className={styles.addressText}>{addr.fullName} &middot; {addr.phone}</p>
                        <p className={styles.addressText}>{addr.line1}, {addr.city}, {addr.state} {addr.pincode}</p>
                      </div>
                    );
                  })}
                  <div className={styles.addNewCard} onClick={() => { setNewAddress(emptyAddress()); setShowAddressForm(true); }}>
                    <Plus size={16} /> Add New Address
                  </div>
                </div>
                {error && activeStep === 2 && <p className={styles.fieldErrorText}>{error}</p>}
                <button type="button" className={styles.deliverButton} onClick={handleDeliverHere}>
                  DELIVER HERE
                </button>
              </>
            )}

            {showAddressForm && (
              <form
                className={`${styles.addressForm} ${shakeForm ? styles.shake : ''}`}
                onSubmit={(e) => { e.preventDefault(); handleDeliverHere(); }}
              >
                {addresses.length > 0 && (
                  <button
                    type="button"
                    className={styles.changeButton}
                    style={{ alignSelf: 'flex-start' }}
                    onClick={() => setShowAddressForm(false)}
                  >
                    ← Use a saved address
                  </button>
                )}

                <div className={styles.chipRow}>
                  {TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      className={`${styles.chip} ${newAddress.type === value ? styles.chipActive : ''}`}
                      onClick={() => setNewAddress({ ...newAddress, type: value })}
                    >
                      <Icon size={13} /> {label}
                    </button>
                  ))}
                </div>

                <div className={styles.fieldRow}>
                  <div className={styles.floatingField}>
                    <input placeholder=" " value={newAddress.fullName} onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })} className={addressErrors.fullName ? styles.fieldErrorInput : ''} />
                    <label>Full Name</label>
                  </div>
                  <div className={styles.floatingField}>
                    <input placeholder=" " inputMode="numeric" value={newAddress.phone} onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })} className={addressErrors.phone ? styles.fieldErrorInput : ''} />
                    <label>Phone Number</label>
                  </div>
                </div>
                {(addressErrors.fullName || addressErrors.phone) && (
                  <p className={styles.fieldErrorText}>{addressErrors.fullName || addressErrors.phone}</p>
                )}

                <div className={styles.floatingField}>
                  <input placeholder=" " value={newAddress.line1} onChange={(e) => setNewAddress({ ...newAddress, line1: e.target.value })} className={addressErrors.line1 ? styles.fieldErrorInput : ''} />
                  <label>Street Address</label>
                </div>
                {addressErrors.line1 && <p className={styles.fieldErrorText}>{addressErrors.line1}</p>}

                <div className={styles.floatingField}>
                  <input placeholder=" " value={newAddress.label} onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })} />
                  <label>Landmark (optional)</label>
                </div>

                <div className={styles.fieldRow3}>
                  <div className={styles.floatingField}>
                    <input placeholder=" " inputMode="numeric" value={newAddress.pincode} onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })} className={addressErrors.pincode ? styles.fieldErrorInput : ''} />
                    <label>Pincode</label>
                  </div>
                  <div className={styles.floatingField}>
                    <input placeholder=" " value={newAddress.city} onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })} className={addressErrors.city ? styles.fieldErrorInput : ''} />
                    <label>City</label>
                  </div>
                  <div className={styles.floatingField}>
                    <input placeholder=" " value={newAddress.state} onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })} className={addressErrors.state ? styles.fieldErrorInput : ''} />
                    <label>State</label>
                  </div>
                </div>
                {(addressErrors.pincode || addressErrors.city || addressErrors.state) && (
                  <p className={styles.fieldErrorText}>{addressErrors.pincode || addressErrors.city || addressErrors.state}</p>
                )}

                <button type="submit" className={styles.deliverButton}>
                  DELIVER HERE
                </button>
              </form>
            )}
          </StepCard>

          {/* STEP 3: ORDER SUMMARY */}
          <StepCard stepNum={3} title="ORDER SUMMARY" isCompleted={activeStep > 3} summary={`${items.length} item(s)`} onEdit={() => setActiveStep(3)}>
            {items.map((item) => (
              <div key={item.id} className={styles.itemRow}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', minWidth: 0 }}>
                  <div className={styles.itemImage} style={{ backgroundImage: item.image ? `url(${item.image})` : 'none' }} />
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>{item.name}</span>
                    <div className={styles.itemMetaRow}>
                      {item.category && <span className={styles.variantChip}>{item.category}</span>}
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Qty: {item.quantity}</span>
                    </div>
                  </div>
                </div>
                <span className={styles.itemPrice}>₹{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}

            <div className={styles.promoCard}>
              <div className={styles.promoInputRow}>
                <div className={styles.promoInputWrap}>
                  <Tag size={15} />
                  <input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Have a promo code?" />
                </div>
                <button type="button" className={styles.applyButton} onClick={() => handleApplyCoupon()}>
                  Apply
                </button>
              </div>
              <div className={styles.offerChipsRow}>
                {AVAILABLE_OFFERS.map((code) => (
                  <button key={code} type="button" className={styles.offerChip} onClick={() => handleApplyCoupon(code)}>
                    {code}
                  </button>
                ))}
              </div>
              {couponError && <p className={styles.fieldErrorText}>{couponError}</p>}
              {appliedCoupon && (
                <div className={styles.successBanner}>
                  <CheckCircle2 size={15} /> Coupon "{appliedCoupon.code}" applied — ₹{discount.toFixed(2)} saved!
                </div>
              )}
            </div>

            {error && activeStep === 3 && <p className={styles.fieldErrorText}>{error}</p>}

            <div className={styles.emailNote}>
              <Mail size={15} />
              Order confirmation email will be sent to <strong>{session?.user?.email}</strong>
            </div>

            <div className={styles.continueRow}>
              <button type="button" className={styles.continueButton} onClick={handleSummarySubmit}>
                CONTINUE
              </button>
            </div>
          </StepCard>

          {/* STEP 4: PAYMENT */}
          <StepCard stepNum={4} title="PAYMENT OPTIONS" isCompleted={false} onEdit={() => {}}>
            <div className={styles.paymentGrid}>
              <div
                className={`${styles.paymentCard} ${paymentMethod === 'card' ? styles.paymentCardSelected : ''}`}
                onClick={() => setPaymentMethod('card')}
              >
                <div className={styles.paymentCardHeader}>
                  <span className={`${styles.paymentRadio} ${paymentMethod === 'card' ? styles.paymentRadioSelected : ''}`} />
                  <span className={styles.paymentIcon}>💳</span>
                  <span className={styles.paymentLabel}>Credit / Debit Card</span>
                </div>
                {paymentMethod === 'card' && (
                  <div className={styles.paymentCardBody} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.cardNumberRow}>
                      <div className={styles.floatingField}>
                        <input placeholder=" " value={formatCardNumber(cardNumber)} onChange={(e) => setCardNumber(e.target.value)} />
                        <label>Card Number</label>
                      </div>
                      {cardType && <span className={styles.cardTypeIcon}>{cardType}</span>}
                    </div>
                    <div className={styles.cardFieldsRow}>
                      <div className={styles.floatingField}>
                        <input placeholder=" " value={formatExpiry(cardExpiry)} onChange={(e) => setCardExpiry(e.target.value)} />
                        <label>MM/YY</label>
                      </div>
                      <div className={styles.floatingField}>
                        <input placeholder=" " value={cardCvv} onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 3))} />
                        <label>CVV</label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div
                className={`${styles.paymentCard} ${paymentMethod === 'upi' ? styles.paymentCardSelected : ''}`}
                onClick={() => setPaymentMethod('upi')}
              >
                <div className={styles.paymentCardHeader}>
                  <span className={`${styles.paymentRadio} ${paymentMethod === 'upi' ? styles.paymentRadioSelected : ''}`} />
                  <span className={styles.paymentIcon}><Smartphone size={20} /></span>
                  <span className={styles.paymentLabel}>UPI</span>
                </div>
                {paymentMethod === 'upi' && (
                  <div className={styles.paymentCardBody} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.floatingField}>
                      <input placeholder=" " value={upiId} onChange={(e) => setUpiId(e.target.value)} />
                      <label>UPI ID</label>
                    </div>
                    <div className={styles.upiAppsRow}>
                      {UPI_APPS.map((app) => (
                        <span
                          key={app}
                          className={styles.pillChip}
                          onClick={() => setUpiId(`${upiId.split('@')[0] || 'yourname'}@${app.toLowerCase()}`)}
                        >
                          {app}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div
                className={`${styles.paymentCard} ${paymentMethod === 'netbanking' ? styles.paymentCardSelected : ''}`}
                onClick={() => setPaymentMethod('netbanking')}
              >
                <div className={styles.paymentCardHeader}>
                  <span className={`${styles.paymentRadio} ${paymentMethod === 'netbanking' ? styles.paymentRadioSelected : ''}`} />
                  <span className={styles.paymentIcon}><Landmark size={20} /></span>
                  <span className={styles.paymentLabel}>Net Banking</span>
                </div>
                {paymentMethod === 'netbanking' && (
                  <div className={styles.paymentCardBody} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.bankGrid}>
                      {BANKS.map((bank) => (
                        <span
                          key={bank}
                          className={`${styles.pillChip} ${selectedBank === bank ? styles.pillChipSelected : ''}`}
                          onClick={() => setSelectedBank(bank)}
                        >
                          {bank}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div
                className={`${styles.paymentCard} ${paymentMethod === 'cod' ? styles.paymentCardSelected : ''}`}
                onClick={() => setPaymentMethod('cod')}
              >
                <div className={styles.paymentCardHeader}>
                  <span className={`${styles.paymentRadio} ${paymentMethod === 'cod' ? styles.paymentRadioSelected : ''}`} />
                  <span className={styles.paymentIcon}>🤝</span>
                  <span className={styles.paymentLabel}>Cash on Delivery</span>
                  <span className={styles.availableChip}>Available</span>
                </div>
                <p className={styles.codBadge}>Pay ₹{total.toFixed(2)} on delivery</p>
              </div>
            </div>

            {error && activeStep === 4 && <p className={styles.fieldErrorText} style={{ marginTop: '1rem' }}>{error}</p>}
          </StepCard>
        </div>

        {/* RIGHT: sticky price details */}
        <div className={styles.summaryColumn}>
          <div className={styles.priceCard}>
            <div className={styles.priceHeader}>
              <h3 className={styles.priceHeaderTitle}>Price Details</h3>
            </div>
            <div className={styles.priceBody}>
              <div className={styles.priceRow}>
                <span>Price ({items.length} item{items.length === 1 ? '' : 's'})</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className={styles.priceRow}>
                <span>Delivery Charges</span>
                <span className={delivery === 0 ? styles.freeTag : ''}>{delivery === 0 ? 'Free' : `₹${delivery.toFixed(2)}`}</span>
              </div>
              {appliedCoupon && (
                <div className={`${styles.priceRow} ${styles.priceRowDiscount}`}>
                  <span>Discount</span>
                  <span>−₹{discount.toFixed(2)}</span>
                </div>
              )}

              {amountToFreeDelivery > 0 ? (
                <div className={styles.progressWrap}>
                  <span className={styles.progressText}>Add ₹{amountToFreeDelivery.toFixed(2)} more for free delivery</span>
                  <div className={styles.progressTrack}>
                    <div className={styles.progressFill} style={{ width: `${freeDeliveryProgress}%` }} />
                  </div>
                </div>
              ) : (
                <div className={styles.progressWrap}>
                  <span className={styles.progressText} style={{ color: 'var(--success)' }}>🎉 You've unlocked free delivery!</span>
                </div>
              )}

              <hr className={styles.priceDivider} />

              <div className={styles.priceTotalRow}>
                <span className={styles.priceTotalLabel}>Total Amount Payable</span>
                <span className={styles.priceTotalValue}>₹{total.toFixed(2)}</span>
              </div>

              <div className={styles.secureBadgesRow}>
                <span className={styles.secureBadge}><Lock size={11} /> SSL Encrypted</span>
                <span className={styles.secureBadge}>Visa</span>
                <span className={styles.secureBadge}>Mastercard</span>
                <span className={styles.secureBadge}>UPI</span>
              </div>

              {activeStep === 4 && (
                <button type="button" className={styles.placeOrderButton} disabled={placing} onClick={placeOrder}>
                  {placing ? (
                    <><span className={styles.spinner} /> Placing your order…</>
                  ) : (
                    <><Lock size={16} /> Place Order Securely — ₹{total.toFixed(2)}</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {activeStep === 4 && (
        <div className={styles.mobileBar}>
          <div className={styles.mobileBarTotal}>
            <span className={styles.mobileBarLabel}>Total</span>
            <span className={styles.mobileBarValue}>₹{total.toFixed(2)}</span>
          </div>
          <button type="button" className={styles.placeOrderButton} disabled={placing} onClick={placeOrder}>
            {placing ? <span className={styles.spinner} /> : <><Lock size={16} /> Place Order</>}
          </button>
        </div>
      )}

      <Confetti active={showConfetti} />
    </main>
  );
}
