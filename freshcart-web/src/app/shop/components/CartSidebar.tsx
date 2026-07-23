'use client';

import { useRouter } from 'next/navigation';
import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '../../../lib/store';
import { formatPrice } from '../../../lib/formatPrice';
import { ProductImage } from '../../../components/ProductImage';
import styles from './CartSidebar.module.css';

export function CartSidebar() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const hasHydrated = useCartStore((state) => state.hasHydrated);

  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <h2>Your cart</h2>
        <span className={styles.itemCount}>{itemCount} item{itemCount === 1 ? '' : 's'}</span>
      </div>

      {!hasHydrated || items.length === 0 ? (
        <div className={styles.emptyState}>
          <ShoppingCart size={22} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
          <p>Your cart is empty</p>
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
                  <p className={styles.itemMeta}>{item.quantity} × {formatPrice(item.price)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.footer}>
            <div className={styles.totalRow}>
              <span>Total</span>
              <span>{formatPrice(total)}</span>
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
