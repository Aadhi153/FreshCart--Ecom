'use client';

import { useEffect, useMemo, useState } from 'react';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { useCartStore, useWishlistStore } from '../lib/store';
import { useToast } from './ToastProvider';
import { EmptyState, ProductCardSkeleton } from './Skeleton';
import { ProductImage } from './ProductImage';
import { AccountCard } from './AccountCard';
import { AccountButton } from './AccountButton';
import { supabase } from '../lib/supabase';
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
  // Wishlisted items only carry the price/stock snapshot from whenever they were added,
  // which can go stale — fetch current stock live so "move all to cart" only grabs what's
  // actually purchasable right now, not a months-old cached flag.
  const [stockById, setStockById] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (wishlistItems.length === 0) return;
    supabase
      .from('products')
      .select('id, in_stock')
      .in('id', wishlistItems.map((item) => String(item.id)))
      .then(({ data }) => {
        if (!data) return;
        setStockById(Object.fromEntries(data.map((p) => [p.id, p.in_stock])));
      });
  }, [wishlistItems]);

  const sortedItems = useMemo(() => {
    const items = [...wishlistItems];
    if (sort === 'price-asc') return items.sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') return items.sort((a, b) => b.price - a.price);
    if (sort === 'name') return items.sort((a, b) => a.name.localeCompare(b.name));
    return items;
  }, [wishlistItems, sort]);

  const addAllToCart = () => {
    // stockById[id] === false is the only thing that excludes an item — undefined (still
    // loading, or a product Supabase didn't return) is treated as includable rather than
    // silently dropping items while the stock check is in flight.
    const inStockItems = wishlistItems.filter((item) => stockById[String(item.id)] !== false);
    inStockItems.forEach((item) => {
      addCartItem({ id: item.id, productId: String(item.id), name: item.name, price: item.price, image: item.image, category: item.category });
    });
    const skipped = wishlistItems.length - inStockItems.length;
    showToast(
      `Added ${inStockItems.length} item${inStockItems.length === 1 ? '' : 's'} to cart` +
        (skipped > 0 ? ` (${skipped} out of stock skipped)` : ''),
      'success'
    );
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
          <AccountButton compact variant="primary" onClick={addAllToCart} leftIcon={<ShoppingCart size={14} />}>
            Move all to cart
          </AccountButton>
          <AccountButton compact variant="danger" onClick={clearAll} leftIcon={<Trash2 size={14} />}>
            Clear all
          </AccountButton>
        </div>
      </div>

      <div className={styles.grid}>
        {sortedItems.map((item) => {
          const outOfStock = stockById[String(item.id)] === false;
          return (
            <AccountCard key={item.id} hoverable style={{ display: 'grid', gap: '0.55rem' }}>
              <div style={{ position: 'relative', width: '100%', height: 110, borderRadius: 'var(--acc-thumbnail-radius, var(--radius-sm))', overflow: 'hidden' }}>
                <ProductImage src={item.image} alt={item.name} sizes="190px" imageStyle={{ objectFit: 'cover' }} />
              </div>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 700 }}>{item.category || 'Product'}</p>
              <h2 style={{ margin: 0, fontSize: '1rem' }}>{item.name}</h2>
              <p style={{ margin: 0, color: 'var(--accent)', fontWeight: 900 }}>Rs.{item.price.toFixed(2)}</p>
              {outOfStock && (
                <p style={{ margin: 0, color: '#B91C1C', fontWeight: 700, fontSize: '0.78rem' }}>Out of stock</p>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <AccountButton
                  compact
                  variant="primary"
                  disabled={outOfStock}
                  onClick={() => {
                    addCartItem({ id: item.id, productId: String(item.id), name: item.name, price: item.price, image: item.image, category: item.category });
                    showToast(`${item.name} added to cart`, 'success');
                  }}
                  leftIcon={<ShoppingCart size={15} />}
                >
                  Add
                </AccountButton>
                <AccountButton
                  compact
                  variant="danger"
                  onClick={() => {
                    removeWishlistItem(item.id);
                    showToast('Removed from wishlist', 'success');
                  }}
                >
                  Remove
                </AccountButton>
              </div>
            </AccountCard>
          );
        })}
      </div>
    </div>
  );
}
