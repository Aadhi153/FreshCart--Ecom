'use client';

import { AlertCircle, PackageSearch } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { gridVariants } from '../../../lib/motion';
import { ProductCardSkeleton, EmptyState } from '../../../components/Skeleton';
import type { ProductCard as ProductCardData } from '../filters';
import { ProductCard } from './ProductCard';
import styles from '../page.module.css';

const SKELETON_COUNT = 10;

interface ProductGridProps {
  products: ProductCardData[];
  totalCount: number;
  loading: boolean;
  isFiltering: boolean;
  fetchError: string;
  searchTerm: string;
  wishlistIds: Set<string | number>;
  onToggleWishlist: (product: ProductCardData) => void;
  onQuickAdd: (product: ProductCardData) => void;
  onClearFilters: () => void;
  onRetry: () => void;
  onLoadMore: () => void;
}

export function ProductGrid({
  products,
  totalCount,
  loading,
  isFiltering,
  fetchError,
  searchTerm,
  wishlistIds,
  onToggleWishlist,
  onQuickAdd,
  onClearFilters,
  onRetry,
  onLoadMore,
}: ProductGridProps) {
  const showSkeleton = loading || isFiltering;
  const hasMore = !showSkeleton && !fetchError && products.length < totalCount;

  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        {fetchError ? (
          <motion.div
            key="error"
            className={styles.productGrid}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            <EmptyState
              icon={<AlertCircle size={24} />}
              heading="Couldn't load products"
              subtext={fetchError}
              ctaLabel="Retry"
              ctaOnClick={onRetry}
            />
          </motion.div>
        ) : showSkeleton ? (
          <motion.div
            key="skeleton"
            className={styles.productGrid}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </motion.div>
        ) : products.length === 0 ? (
          <motion.div
            key="empty"
            className={styles.productGrid}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            {searchTerm.trim() ? (
              <EmptyState
                icon={<PackageSearch size={24} />}
                heading={`No products match "${searchTerm}"`}
                subtext="Check your spelling, try a shorter search, or browse a category above."
                ctaLabel="Clear filters"
                ctaOnClick={onClearFilters}
              />
            ) : (
              <EmptyState
                icon={<PackageSearch size={24} />}
                heading="No products found"
                subtext="Try adjusting your filters."
                ctaLabel="Clear filters"
                ctaOnClick={onClearFilters}
              />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            className={styles.productGrid}
            variants={gridVariants}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                searchTerm={searchTerm}
                inWishlist={wishlistIds.has(product.id)}
                onToggleWishlist={onToggleWishlist}
                onQuickAdd={onQuickAdd}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {hasMore && (
        <div className={styles.loadMoreWrap}>
          <button type="button" className={styles.loadMoreBtn} onClick={onLoadMore}>
            Load more products
          </button>
          <span className={styles.loadMoreCount}>Showing {products.length} of {totalCount}</span>
        </div>
      )}
    </>
  );
}
