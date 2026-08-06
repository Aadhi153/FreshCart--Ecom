'use client';

import { useEffect, useMemo, useState } from 'react';
import { Heart, ShoppingCart, Trash2, X } from 'lucide-react';
import type { ActivePromotion } from '@freshcart/types';
import { useCartStore, useWishlistStore } from '../lib/store';
import { getActivePromotions, getServerWishlist } from '../lib/api';
import { findBestProductMatch } from '../lib/promotionMath';
import { formatPrice } from '../lib/formatPrice';
import { timeAgo } from '../lib/timeAgo';
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
  // actually purchasable right now, not a months-old cached flag. category_id rides along
  // on the same query since it's only needed here, to match items against active promotions.
  const [stockById, setStockById] = useState<Record<string, boolean>>({});
  const [categoryIdById, setCategoryIdById] = useState<Record<string, string | null>>({});
  const [activePromotions, setActivePromotions] = useState<ActivePromotion[]>([]);
  const [addedAtById, setAddedAtById] = useState<Record<string, string>>({});
  const [confirmingClear, setConfirmingClear] = useState(false);

  useEffect(() => {
    if (wishlistItems.length === 0) return;
    supabase
      .from('products')
      .select('id, in_stock, category_id')
      .in('id', wishlistItems.map((item) => String(item.id)))
      .then(({ data }) => {
        if (!data) return;
        setStockById(Object.fromEntries(data.map((p) => [p.id, p.in_stock])));
        setCategoryIdById(Object.fromEntries(data.map((p) => [p.id, p.category_id])));
      });
  }, [wishlistItems]);

  useEffect(() => {
    getActivePromotions().then(setActivePromotions);
  }, []);

  // Best-effort — guests (no session) have no server-side wishlist, so the "Added
  // X ago" line just doesn't render for their (local-only) items.
  useEffect(() => {
    getServerWishlist()
      .then((rows) => {
        setAddedAtById(
          Object.fromEntries(rows.filter((r) => r.products).map((r) => [r.products!.id, r.created_at]))
        );
      })
      .catch(() => {});
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
    setConfirmingClear(false);
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
          {confirmingClear ? (
            <div className={styles.clearConfirm}>
              <span className={styles.clearConfirmText}>Clear all {wishlistItems.length} items?</span>
              <AccountButton compact variant="secondary" onClick={() => setConfirmingClear(false)}>
                Cancel
              </AccountButton>
              <AccountButton compact variant="danger-solid" onClick={clearAll}>
                Clear
              </AccountButton>
            </div>
          ) : (
            <AccountButton compact variant="danger" onClick={() => setConfirmingClear(true)} leftIcon={<Trash2 size={14} />}>
              Clear all
            </AccountButton>
          )}
        </div>
      </div>

      <div className={styles.grid}>
        {sortedItems.map((item) => {
          const outOfStock = stockById[String(item.id)] === false;
          const onSale = activePromotions.length > 0 && Boolean(
            findBestProductMatch({ id: String(item.id), categoryId: categoryIdById[String(item.id)] ?? null }, activePromotions)
          );
          const addedAt = addedAtById[String(item.id)];

          return (
            <AccountCard key={item.id} hoverable className={styles.card}>
              <div className={styles.thumb}>
                <ProductImage src={item.image} alt={item.name} sizes="56px" imageStyle={{ objectFit: 'cover' }} />
                {onSale && <span className={styles.saleBadge}>Sale</span>}
              </div>

              <div className={styles.body}>
                <div className={styles.titleRow}>
                  <div style={{ minWidth: 0 }}>
                    <p className={styles.category}>{item.category || 'Product'}</p>
                    <p className={styles.name}>{item.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      removeWishlistItem(item.id);
                      showToast('Removed from wishlist', 'success');
                    }}
                    aria-label={`Remove ${item.name} from wishlist`}
                    className={styles.removeButton}
                  >
                    <X size={14} />
                  </button>
                </div>

                <p className={styles.price}>{formatPrice(item.price)}</p>

                {addedAt && <p className={styles.addedAt}>Added {timeAgo(addedAt)}</p>}

                <AccountButton
                  compact
                  variant="primary"
                  disabled={outOfStock}
                  onClick={() => {
                    addCartItem({ id: item.id, productId: String(item.id), name: item.name, price: item.price, image: item.image, category: item.category });
                    showToast(`${item.name} added to cart`, 'success');
                  }}
                  leftIcon={outOfStock ? undefined : <ShoppingCart size={13} />}
                  style={{ width: '100%' }}
                >
                  {outOfStock ? 'Out of stock' : 'Add to cart'}
                </AccountButton>
              </div>
            </AccountCard>
          );
        })}
      </div>
    </div>
  );
}
