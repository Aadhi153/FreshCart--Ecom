'use client';

import { useMemo, useState } from 'react';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { useCartStore, useWishlistStore } from '../lib/store';
import { useToast } from './ToastProvider';
import { EmptyState, ProductCardSkeleton } from './Skeleton';
import { ProductImage } from './ProductImage';
import styles from './WishlistDetails.module.css';

const SORT_OPTIONS = [
  { value: 'recent', label: 'Recently added' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name', label: 'Name: A to Z' },
] as const;

export function WishlistDetails() {
  const wishlistItems = useWishlistStore((state) => state.items);
  const removeWishlistItem = useWishlistStore((state) => state.removeItem);
  const clearWishlist = useWishlistStore((state) => state.clearAll);
  const addCartItem = useCartStore((state) => state.addItem);
  const hasHydrated = useWishlistStore((state) => state.hasHydrated);
  const { showToast } = useToast();
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]['value']>('recent');

  const sortedItems = useMemo(() => {
    const items = [...wishlistItems];
    if (sort === 'price-asc') return items.sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') return items.sort((a, b) => b.price - a.price);
    if (sort === 'name') return items.sort((a, b) => a.name.localeCompare(b.name));
    return items;
  }, [wishlistItems, sort]);

  const addAllToCart = () => {
    wishlistItems.forEach((item) => {
      addCartItem({ id: item.id, productId: String(item.id), name: item.name, price: item.price, image: item.image, category: item.category });
    });
    showToast(`Added ${wishlistItems.length} item${wishlistItems.length === 1 ? '' : 's'} to cart`, 'success');
  };

  const clearAll = () => {
    clearWishlist();
    showToast('Wishlist cleared', 'success');
  };

  if (!hasHydrated) {
    return (
      <div className={styles.grid}>
        <ProductCardSkeleton />
        <ProductCardSkeleton />
        <ProductCardSkeleton />
      </div>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <EmptyState
        icon={<Heart size={24} />}
        heading="No wishlist products yet"
        subtext="Click the heart on a product to save it here."
        ctaHref="/shop"
        ctaLabel="Browse products"
      />
    );
  }

  return (
    <div>
      <div className={styles.header}>
        <p className={styles.count}>{wishlistItems.length} saved item{wishlistItems.length === 1 ? '' : 's'}</p>
        <div className={styles.controls}>
          <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className={styles.select}>
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button type="button" onClick={addAllToCart} className={`${styles.actionButton} ${styles.actionButtonPrimary}`}>
            <ShoppingCart size={14} />
            Add all to cart
          </button>
          <button type="button" onClick={clearAll} className={`${styles.actionButton} ${styles.actionButtonDanger}`}>
            <Trash2 size={14} />
            Clear all
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        {sortedItems.map((item) => (
          <article key={item.id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.9rem', display: 'grid', gap: '0.55rem' }}>
            <div style={{ position: 'relative', width: '100%', height: 110, borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              <ProductImage src={item.image} alt={item.name} sizes="190px" imageStyle={{ objectFit: 'cover' }} />
            </div>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 700 }}>{item.category || 'Product'}</p>
            <h2 style={{ margin: 0, fontSize: '1rem' }}>{item.name}</h2>
            <p style={{ margin: 0, color: 'var(--accent)', fontWeight: 900 }}>Rs.{item.price.toFixed(2)}</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => {
                addCartItem({ id: item.id, productId: String(item.id), name: item.name, price: item.price, image: item.image, category: item.category });
                showToast(`${item.name} added to cart`, 'success');
              }} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent)', background: 'var(--gradient-primary)', color: '#fff', cursor: 'pointer', fontWeight: 800 }}>
                <ShoppingCart size={15} />
                Add
              </button>
              <button type="button" onClick={() => {
                removeWishlistItem(item.id);
                showToast('Removed from wishlist', 'success');
              }} style={{ padding: '0.5rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'transparent', color: '#B91C1C', cursor: 'pointer', fontWeight: 800 }}>
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
