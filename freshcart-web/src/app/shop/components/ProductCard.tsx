'use client';

import Link from 'next/link';
import { Heart, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { itemVariants } from '../../../lib/motion';
import { highlightMatch } from '../../../lib/highlightMatch';
import { ProductImage } from '../../../components/ProductImage';
import type { ProductCard as ProductCardData } from '../filters';
import styles from '../page.module.css';

interface ProductCardProps {
  product: ProductCardData;
  searchTerm: string;
  inWishlist: boolean;
  onToggleWishlist: (product: ProductCardData) => void;
  onQuickAdd: (product: ProductCardData) => void;
}

export function ProductCard({ product, searchTerm, inWishlist, onToggleWishlist, onQuickAdd }: ProductCardProps) {
  return (
    <motion.div
      className={styles.productCard}
      variants={itemVariants}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.99 }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleWishlist(product);
        }}
        title="Wishlist"
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 26,
          height: 26,
          borderRadius: '50%',
          border: '1px solid var(--border-color)',
          background: 'var(--layer-0)',
          color: inWishlist ? '#B91C1C' : 'var(--text-secondary)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        }}
      >
        <Heart size={14} fill={inWishlist ? 'currentColor' : 'none'} />
      </button>

      <Link href={`/shop/${product.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <div className={styles.productImageContainer}>
          <ProductImage
            src={product.image_url}
            alt={product.name}
            sizes="(max-width: 520px) 50vw, (max-width: 900px) 33vw, 20vw"
            imageStyle={{ objectFit: 'contain' }}
          />
        </div>

        <div className={styles.productInfo}>
          <h3 style={{ fontSize: '0.88rem', margin: '0', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {highlightMatch(product.name, searchTerm)}
          </h3>

          <div className={styles.ratingRow}>
            {product.review_count > 0 ? (
              <>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={10} fill={i < Math.round(product.rating) ? '#F4A261' : 'none'} color="#F4A261" />
                ))}
                <span className={styles.ratingCount}>({product.review_count})</span>
              </>
            ) : (
              <span className={styles.ratingCount} style={{ marginLeft: 0 }}>No reviews yet</span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 'auto' }}>
            <span className="price" style={{ fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--text-primary)' }}>₹{product.price.toFixed(2)}</span>
          </div>
        </div>
      </Link>

      <div style={{ padding: '0 0.7rem 0.7rem 0.7rem' }}>
        {product.stock_quantity > 0 && product.in_stock ? (
          <button
            className={styles.addToCartBtn}
            style={{ margin: 0 }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onQuickAdd(product);
            }}
          >
            Add to Cart
          </button>
        ) : (
          <button
            className={styles.addToCartBtn}
            style={{ margin: 0, opacity: 0.5, cursor: 'not-allowed', backgroundColor: 'var(--layer-2)', color: 'var(--text-secondary)' }}
            disabled
          >
            Out of Stock
          </button>
        )}
      </div>
    </motion.div>
  );
}
