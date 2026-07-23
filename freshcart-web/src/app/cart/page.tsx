'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Minus, Plus, ShoppingCart, Trash2, Check, Tag, Lock, Truck,
  RefreshCw, ShieldCheck, ChevronRight, PartyPopper, Star,
} from 'lucide-react';
import { useCartStore } from '../../lib/store';
import { gridVariants, itemVariants } from '../../lib/motion';
import { useToast } from '../../components/ToastProvider';
import { CartItemSkeleton } from '../../components/Skeleton';
import { ProductImage } from '../../components/ProductImage';
import { supabase } from '../../lib/supabase';
import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD } from '../../lib/constants';
import { getTopRatedProducts, getProductsByIds, getCheapestVariant, type RatedProductCard } from '../../lib/queries';
import { getRecentlyViewedIds } from '../../lib/recentlyViewed';
import styles from './page.module.css';

type Coupon = {
  code: string;
  discount_type: string;
  discount_value: number;
  max_discount_amount: number | null;
  min_order_amount: number;
};

function splitVariant(name: string): [string, string | null] {
  const match = name.match(/^(.+?) - (.+)$/);
  return match ? [match[1], match[2]] : [name, null];
}

function ProductCard({ product, onAdd }: { product: RatedProductCard; onAdd: (p: RatedProductCard) => void }) {
  return (
    <motion.article className={styles.recoCard} whileHover={{ y: -4 }}>
      <Link href={`/shop/${product.id}`} className={styles.recoImageLink}>
        <ProductImage src={product.image} alt={product.name} sizes="180px" iconSize={20} className={styles.recoImage} />
      </Link>
      <div className={styles.recoBody}>
        <span className={styles.recoCategory}>{product.category}</span>
        <Link href={`/shop/${product.id}`} className={styles.recoName}>{product.name}</Link>
        {product.reviewCount > 0 && (
          <div className={styles.recoRating}>
            <Star size={11} fill="#F4A261" color="#F4A261" />
            <span>{product.rating.toFixed(1)}</span>
          </div>
        )}
        <div className={styles.recoFooter}>
          <strong>₹{product.price.toFixed(2)}</strong>
          <button type="button" className={styles.recoAddBtn} onClick={() => onAdd(product)}>
            Add
          </button>
        </div>
      </div>
    </motion.article>
  );
}

export default function CartPage() {
  const { items, removeItem, updateQuantity, addItem, hasHydrated } = useCartStore();
  const { showToast } = useToast();

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | number | null>(null);

  const [recommended, setRecommended] = useState<RatedProductCard[]>([]);
  const [popular, setPopular] = useState<RatedProductCard[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<RatedProductCard[]>([]);
  const [showAllRecentlyViewed, setShowAllRecentlyViewed] = useState(false);

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const delivery = subtotal > 0 && subtotal < FREE_DELIVERY_THRESHOLD ? DELIVERY_FEE : 0;
  const amountToFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  const freeDeliveryProgress = Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100);

  const discount = appliedCoupon
    ? Math.min(
        appliedCoupon.discount_type === 'flat'
          ? appliedCoupon.discount_value
          : (subtotal * appliedCoupon.discount_value) / 100,
        appliedCoupon.max_discount_amount ?? Infinity,
        subtotal
      )
    : 0;
  const total = subtotal + delivery - discount;

  useEffect(() => {
    getTopRatedProducts(12).then(setPopular);
  }, []);

  useEffect(() => {
    const ids = getRecentlyViewedIds('', 15);
    if (ids.length > 0) {
      getProductsByIds(ids).then((data) => setRecentlyViewed(data.map((p) => ({ ...p, rating: 0, reviewCount: 0 }))));
    }
  }, []);

  const cartProductIdsKey = items.map((item) => item.productId).join(',');
  useEffect(() => {
    if (!hasHydrated) return;
    const cartProductIds = new Set(cartProductIdsKey ? cartProductIdsKey.split(',') : []);
    getTopRatedProducts(12).then((data) => {
      setRecommended(data.filter((p) => !cartProductIds.has(p.id)).slice(0, 5));
    });
    // Re-derive whenever the cart's product set changes, so a just-added
    // recommendation doesn't linger in its own "you might also like" row.
  }, [hasHydrated, cartProductIdsKey]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    setCouponError('');
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponCode.trim().toUpperCase())
      .eq('active', true)
      .maybeSingle();
    setApplyingCoupon(false);

    if (error || !data) {
      setAppliedCoupon(null);
      setCouponError('Invalid or expired coupon code.');
      return;
    }
    if (subtotal < data.min_order_amount) {
      setAppliedCoupon(null);
      setCouponError(`Minimum order value ₹${data.min_order_amount} required.`);
      return;
    }
    setAppliedCoupon(data);
  };

  const handleConfirmRemove = (id: string | number, name: string) => {
    removeItem(id);
    setConfirmRemoveId(null);
    showToast(`${name} removed from cart`, 'success');
  };

  const handleAddRecommended = async (product: RatedProductCard) => {
    const variant = await getCheapestVariant(product.id);
    const finalPrice = product.price + (variant?.priceAdjustment || 0);
    const name = variant ? `${product.name} - ${variant.name}` : product.name;
    addItem({
      id: variant ? `${product.id}-${variant.id}` : product.id,
      productId: product.id,
      variantId: variant?.id,
      name,
      price: finalPrice,
      image: variant?.image || product.image,
      category: product.category,
    });
    showToast(`${name} added to cart`, 'success');
  };

  if (hasHydrated && items.length === 0) {
    return (
      <main className={styles.main}>
        <div className={styles.emptyWrap}>
          <motion.div
            className={styles.emptyIconWrap}
            animate={{ y: [0, -22, 0] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeOut' }}
          >
            <ShoppingCart size={48} />
          </motion.div>
          <h2 className={styles.emptyHeading}>Your cart is empty</h2>
          <p className={styles.emptySubtext}>Looks like you haven&apos;t added anything yet. Explore our products and find something you like.</p>
          <Link href="/shop" className={styles.emptyCta}>
            Browse Products
          </Link>
        </div>

        {recentlyViewed.length > 0 && (
          <section className={styles.recoSection}>
            <div className={styles.recoTitleRow}>
              <h2 className={styles.recoTitle}>Recently viewed</h2>
              {recentlyViewed.length > 5 && (
                <button
                  type="button"
                  className={styles.recoMoreBtn}
                  onClick={() => setShowAllRecentlyViewed((prev) => !prev)}
                >
                  {showAllRecentlyViewed ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
            <div className={styles.recoScroll}>
              {recentlyViewed.slice(0, showAllRecentlyViewed ? 15 : 5).map((product) => (
                <ProductCard key={product.id} product={product} onAdd={handleAddRecommended} />
              ))}
            </div>
          </section>
        )}

        {popular.length > 0 && (
          <section className={styles.recoSection}>
            <h2 className={styles.recoTitle}>Start with these</h2>
            <div className={styles.recoGrid}>
              {popular.slice(0, 6).map((product) => (
                <ProductCard key={product.id} product={product} onAdd={handleAddRecommended} />
              ))}
            </div>
          </section>
        )}
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <ChevronRight size={13} />
        <span>Cart</span>
      </nav>

      <h1 className={styles.heading}>
        Your Cart {hasHydrated && items.length > 0 && <span className={styles.headingCount}>({itemCount})</span>}
      </h1>

      {hasHydrated && items.length > 0 && (
        <div className={styles.deliveryBar}>
          {amountToFreeDelivery > 0 ? (
            <>
              <p className={styles.deliveryBarText}>
                <Truck size={15} /> Add ₹{amountToFreeDelivery.toFixed(2)} more for free delivery
              </p>
              <div className={styles.progressTrack}>
                <motion.div
                  className={styles.progressFill}
                  initial={{ width: 0 }}
                  animate={{ width: `${freeDeliveryProgress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </>
          ) : (
            <p className={styles.deliveryBarEarned}>
              <span className={styles.earnedBadge}><Check size={13} /></span>
              You&apos;ve unlocked free delivery <PartyPopper size={16} />
            </p>
          )}
        </div>
      )}

      <div className={styles.layout}>
        <div className={styles.itemsColumn}>
          {!hasHydrated ? (
            <>
              <CartItemSkeleton />
              <CartItemSkeleton />
            </>
          ) : (
            <motion.div variants={gridVariants} initial="hidden" animate="show" className={styles.itemsColumn}>
              <AnimatePresence initial={false}>
                {items.map((item) => {
                  const [displayName, variantName] = splitVariant(item.name);
                  const confirming = confirmRemoveId === item.id;
                  return (
                    <motion.div
                      key={item.id}
                      className={styles.item}
                      variants={itemVariants}
                      initial="hidden"
                      animate="show"
                      exit={{ opacity: 0, x: -60, transition: { duration: 0.25 } }}
                      whileHover={{ y: -3 }}
                      layout
                    >
                      <div className={styles.itemImage}>
                        <ProductImage src={item.image} alt={item.name} sizes="80px" iconSize={22} />
                      </div>

                      <div className={styles.itemBody}>
                        {item.category && <span className={styles.itemCategory}>{item.category}</span>}
                        <h3 className={styles.itemName}>{displayName}</h3>
                        {variantName && <span className={styles.itemVariant}>{variantName}</span>}
                        <p className={styles.itemPrice}>₹{item.price.toFixed(2)}</p>
                      </div>

                      <div className={styles.itemActions}>
                        <div className={styles.stepper}>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                            className={styles.stepperBtn}
                            aria-label={`Decrease quantity of ${item.name}`}
                          >
                            <Minus size={14} />
                          </button>
                          <span className={styles.stepperValue}>
                            <AnimatePresence mode="popLayout" initial={false}>
                              <motion.span
                                key={item.quantity}
                                initial={{ y: -10, opacity: 0, scale: 0.7 }}
                                animate={{ y: 0, opacity: 1, scale: 1 }}
                                exit={{ y: 10, opacity: 0, scale: 0.7 }}
                                transition={{ duration: 0.18 }}
                                style={{ display: 'inline-block' }}
                              >
                                {item.quantity}
                              </motion.span>
                            </AnimatePresence>
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className={styles.stepperBtn}
                            aria-label={`Increase quantity of ${item.name}`}
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        {confirming ? (
                          <div className={styles.confirmRow}>
                            <span>Remove?</span>
                            <button type="button" className={styles.confirmYes} onClick={() => handleConfirmRemove(item.id, displayName)}>Yes</button>
                            <button type="button" className={styles.confirmNo} onClick={() => setConfirmRemoveId(null)}>No</button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmRemoveId(item.id)}
                            className={styles.removeButton}
                            aria-label={`Remove ${displayName} from cart`}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </div>

        {hasHydrated && items.length > 0 && (
          <div className={styles.summaryColumn}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryHeader}>
                <h3>Order Summary</h3>
              </div>

              <div className={styles.summaryBody}>
                <div className={styles.summaryRow}>
                  <span><ShoppingCart size={14} /> Subtotal</span>
                  <span className="price">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span><Truck size={14} /> Delivery</span>
                  <span className="price" style={{ color: delivery === 0 ? 'var(--primary)' : undefined }}>
                    {delivery === 0 ? 'Free' : `₹${delivery.toFixed(2)}`}
                  </span>
                </div>
                {appliedCoupon && (
                  <div className={styles.summaryRow} style={{ color: 'var(--primary)' }}>
                    <span><Tag size={14} /> Discount ({appliedCoupon.code})</span>
                    <span className="price">−₹{discount.toFixed(2)}</span>
                  </div>
                )}

                <div className={styles.couponCard}>
                  <div className={styles.couponRow}>
                    <div className={styles.couponInputWrap}>
                      <Tag size={14} className={styles.couponIcon} />
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="Coupon code"
                        className={styles.couponInput}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={applyingCoupon || !couponCode.trim()}
                      className={styles.couponApplyBtn}
                    >
                      {applyingCoupon ? 'Applying…' : 'Apply'}
                    </button>
                  </div>
                  {couponError && <p className={styles.couponError}>{couponError}</p>}
                  {appliedCoupon && !couponError && (
                    <p className={styles.couponSuccess}>
                      {appliedCoupon.code} applied! ₹{discount.toFixed(0)} off
                    </p>
                  )}
                </div>

                <hr className={styles.divider} />

                <div className={styles.totalRow}>
                  <span>Total</span>
                  <span className={styles.totalValue}>₹{total.toFixed(2)}</span>
                </div>

                <Link href="/checkout" className={styles.checkoutButton}>
                  <Lock size={15} /> Proceed to Checkout
                </Link>
                <Link href="/shop" className={styles.continueShoppingButton}>
                  Continue Shopping
                </Link>

                <div className={styles.trustRow}>
                  <span><ShieldCheck size={14} /> Secure Payment</span>
                  <span><Truck size={14} /> Fast Delivery</span>
                  <span><RefreshCw size={14} /> Easy Returns</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {hasHydrated && items.length > 0 && (
        <div className={styles.mobileCheckoutBar}>
          <div className={styles.mobileCheckoutTotal}>
            <span>Total</span>
            <strong>₹{total.toFixed(2)}</strong>
          </div>
          <Link href="/checkout" className={styles.mobileCheckoutBtn}>
            <Lock size={14} /> Checkout
          </Link>
        </div>
      )}

      {hasHydrated && recommended.length > 0 && (
        <section className={styles.recoSection}>
          <h2 className={styles.recoTitle}>You might also like</h2>
          <div className={styles.recoScroll}>
            {recommended.map((product) => (
              <ProductCard key={product.id} product={product} onAdd={handleAddRecommended} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
