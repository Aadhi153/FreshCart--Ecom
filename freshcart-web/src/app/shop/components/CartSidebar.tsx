'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Minus, Plus, ShoppingCart, Trash2, Truck } from 'lucide-react';
import { useCartStore } from '../../../lib/store';
import { formatPrice } from '../../../lib/formatPrice';
import { ProductImage } from '../../../components/ProductImage';
import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD } from '../../../lib/constants';
import styles from './CartSidebar.module.css';

export function CartSidebar() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const delivery = subtotal > 0 && subtotal < FREE_DELIVERY_THRESHOLD ? DELIVERY_FEE : 0;
  const amountToFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  const total = subtotal + delivery;

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <h2>Your cart</h2>
          <span className={styles.itemCount}>{itemCount} item{itemCount === 1 ? '' : 's'}</span>
        </div>
        {hasHydrated && items.length > 0 && (
          <Link href="/cart" className={styles.viewCartLink}>
            View full cart
          </Link>
        )}
      </div>

      {!hasHydrated || items.length === 0 ? (
        <div className={styles.emptyState}>
          <ShoppingCart size={28} className={styles.emptyIcon} />
          <p className={styles.emptyText}>Your cart is empty</p>
          <Link href="/shop" className={styles.browseLink}>
            Browse products
          </Link>
        </div>
      ) : (
        <>
          <div className={styles.itemList}>
            {items.map((item) => (
              <div key={item.id} className={styles.item}>
                <div className={styles.thumb}>
                  <ProductImage src={item.image} alt={item.name} sizes="44px" imageStyle={{ objectFit: 'contain' }} />
                </div>
                <div className={styles.itemInfo}>
                  <p className={styles.itemName}>{item.name}</p>
                  <p className={styles.itemMeta}>{formatPrice(item.price)}</p>
                  <div className={styles.stepper}>
                    <button
                      type="button"
                      className={styles.stepperBtn}
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      aria-label={`Decrease quantity of ${item.name}`}
                    >
                      <Minus size={12} />
                    </button>
                    <span className={styles.stepperValue}>{item.quantity}</span>
                    <button
                      type="button"
                      className={styles.stepperBtn}
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      aria-label={`Increase quantity of ${item.name}`}
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => removeItem(item.id)}
                  aria-label={`Remove ${item.name} from cart`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          <div className={styles.footer}>
            {amountToFreeDelivery > 0 && (
              <p className={styles.deliveryNote}>
                <Truck size={13} /> Add {formatPrice(amountToFreeDelivery)} more for free delivery
              </p>
            )}
            <div className={styles.priceBreakdown}>
              <div className={styles.priceRow}>
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className={styles.priceRow}>
                <span>Delivery fee</span>
                <span>{delivery === 0 ? 'Free' : formatPrice(delivery)}</span>
              </div>
              <div className={styles.totalRow}>
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
            <button type="button" className={styles.checkoutBtn} onClick={() => router.push('/checkout')}>
              Checkout
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
