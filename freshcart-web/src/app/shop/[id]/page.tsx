'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronRight, Heart, ShoppingCart, Star, Package, Truck, Minus, Plus } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../../lib/supabase';
import { submitReview } from '../../../lib/api';
import { FREE_DELIVERY_THRESHOLD } from '../../../lib/constants';
import { getRelatedProducts, getProductsByIds, getCheapestVariant, type RatedProductCard, type HomeProductCard } from '../../../lib/queries';
import { recordRecentlyViewed, getRecentlyViewedIds } from '../../../lib/recentlyViewed';
import { useCartStore, useWishlistStore } from '../../../lib/store';
import { ProductDetailSkeleton } from '../../../components/Skeleton';
import { ProductImage } from '../../../components/ProductImage';
import { useToast } from '../../../components/ToastProvider';
import styles from './page.module.css';

interface Variant {
  id: string;
  name: string;
  price_adjustment: number;
  stock_quantity: number;
  image_url?: string | null;
}

interface ReviewItem {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  profiles?: { full_name: string };
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  compare_price: number | null;
  category: string;
  category_id: string | null;
  in_stock: boolean;
  image_url: string;
  stock_quantity: number;
  product_variants?: Variant[];
  reviews?: ReviewItem[];
}

function getInitials(name?: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';
}

function formatReviewDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function MiniProductCard({ product }: { product: HomeProductCard | RatedProductCard }) {
  const addItem = useCartStore((s) => s.addItem);
  const addWishlistItem = useWishlistStore((s) => s.addItem);
  const removeWishlistItem = useWishlistStore((s) => s.removeItem);
  const wishlistItems = useWishlistStore((s) => s.items);
  const { showToast } = useToast();
  const inWishlist = wishlistItems.some((item) => item.id === product.id);
  const rating = 'rating' in product ? product.rating : 0;
  const reviewCount = 'reviewCount' in product ? product.reviewCount : 0;

  return (
    <article className={styles.miniCard}>
      <button
        type="button"
        className={styles.miniWishlistBtn}
        onClick={() => {
          if (inWishlist) {
            removeWishlistItem(product.id);
            showToast('Removed from wishlist', 'success');
          } else {
            addWishlistItem({ id: product.id, name: product.name, price: product.price, image: product.image, category: product.category });
            showToast('Added to wishlist', 'success');
          }
        }}
        title="Wishlist"
      >
        <Heart size={13} fill={inWishlist ? 'currentColor' : 'none'} color={inWishlist ? '#B91C1C' : 'var(--text-secondary)'} />
      </button>
      <Link href={`/shop/${product.id}`} className={styles.miniImageLink}>
        <ProductImage src={product.image} alt={product.name} sizes="200px" iconSize={22} />
      </Link>
      <div className={styles.miniBody}>
        {reviewCount > 0 ? (
          <div className={styles.miniRating}>
            <Star size={11} fill="#F4A261" color="#F4A261" />
            <span>{rating.toFixed(1)} ({reviewCount})</span>
          </div>
        ) : (
          <div className={styles.miniRating}>
            <span>No reviews yet</span>
          </div>
        )}
        <h3 className={styles.miniName}>{product.name}</h3>
        <div className={styles.miniFooter}>
          <span className={styles.miniPrice}>₹{product.price.toFixed(2)}</span>
          <button
            type="button"
            className={styles.miniAddBtn}
            onClick={async () => {
              const variant = await getCheapestVariant(product.id);
              const finalPrice = product.price + (variant?.priceAdjustment || 0);
              const name = variant ? `${product.name} - ${variant.name}` : product.name;
              addItem({
                id: variant ? `${product.id}-${variant.id}` : product.id,
                productId: product.id,
                name,
                price: finalPrice,
                image: variant?.image || product.image,
                category: product.category,
              });
              showToast(`${name} added to cart`, 'success');
            }}
          >
            <ShoppingCart size={13} />
          </button>
        </div>
      </div>
    </article>
  );
}

function ScrollRow({ title, products }: { title: string; products: (HomeProductCard | RatedProductCard)[] }) {
  if (products.length === 0) return null;
  return (
    <section className={styles.scrollSection}>
      <h2 className={styles.scrollTitle}>{title}</h2>
      <div className={styles.scrollRow}>
        {products.map((p) => (
          <MiniProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const cartItems = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const addWishlistItem = useWishlistStore((s) => s.addItem);
  const removeWishlistItem = useWishlistStore((s) => s.removeItem);
  const wishlistItems = useWishlistStore((s) => s.items);
  const { showToast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [myRating, setMyRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [related, setRelated] = useState<RatedProductCard[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<HomeProductCard[]>([]);
  const reviewsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
  }, []);

  useEffect(() => {
    if (!params.id) {
      setLoading(false);
      return;
    }
    async function fetchProduct() {
      setLoading(true);
      // Query Supabase directly, same as the shop list page — avoids depending on a
      // separate backend service being deployed/reachable just to view one product.
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name), product_variants(*), reviews(*, profiles(full_name))')
        .eq('id', params.id)
        .order('price_adjustment', { foreignTable: 'product_variants', ascending: true })
        .single();

      if (data && !error) {
        setProduct({ ...data, category: data.categories?.name || 'Uncategorized' });
        const variants = data.product_variants || [];
        if (variants.length > 0) {
          setSelectedVariant(variants[0]);
        }

        recordRecentlyViewed(data.id);
        if (data.category_id) {
          getRelatedProducts(data.category_id, data.id, 5).then(setRelated);
        }
        getProductsByIds(getRecentlyViewedIds(data.id, 4)).then(setRecentlyViewed);
      } else {
        console.error('Failed to fetch product', error);
        setProduct(null);
      }
      setLoading(false);
    }
    fetchProduct();
  }, [params.id]);

  const handleSubmitReview = async () => {
    if (!product) return;
    if (myRating < 1) {
      setReviewError('Please select a star rating.');
      return;
    }
    setReviewError('');
    setSubmittingReview(true);
    try {
      await submitReview(product.id, myRating, myComment);
      // Refetch so the new review + updated average appear immediately.
      const { data } = await supabase
        .from('products')
        .select('*, categories(name), product_variants(*), reviews(*, profiles(full_name))')
        .eq('id', params.id)
        .order('price_adjustment', { foreignTable: 'product_variants', ascending: true })
        .single();
      if (data) setProduct({ ...data, category: data.categories?.name || 'Uncategorized' });
      setMyRating(0);
      setMyComment('');
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    const finalPrice = product.price + (selectedVariant?.price_adjustment || 0);
    const nameWithVariant = selectedVariant ? `${product.name} - ${selectedVariant.name}` : product.name;

    addItem({
      id: selectedVariant ? `${product.id}-${selectedVariant.id}` : product.id,
      productId: product.id,
      name: nameWithVariant,
      price: finalPrice,
      image: product.image_url,
      category: product.category,
      quantity
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
    showToast(`${nameWithVariant} added to cart`, 'success');
  };

  const handleWishlist = () => {
    if (!product) return;

    if (wishlistItems.some((item) => item.id === product.id)) {
      removeWishlistItem(product.id);
      showToast('Removed from wishlist', 'success');
      return;
    }

    addWishlistItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image_url,
      category: product.category,
    });
    showToast('Added to wishlist', 'success');
  };

  const scrollToReviews = () => reviewsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (loading) {
    return (
      <main className={styles.main}>
        <ProductDetailSkeleton />
      </main>
    );
  }

  if (!product) {
    return (
      <div className={styles.notFound}>
        <h1>Product not found</h1>
        <button onClick={() => router.push('/shop')} className={styles.backBtn}>
          Back to Shop
        </button>
      </div>
    );
  }

  const discount = product.compare_price
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
    : null;
  const inWishlist = wishlistItems.some((item) => item.id === product.id);
  const cartItemId = selectedVariant ? `${product.id}-${selectedVariant.id}` : product.id;
  const inCart = cartItems.some((item) => item.id === cartItemId);

  const displayImage = selectedVariant?.image_url || product.image_url;
  const displayPrice = product.price + (selectedVariant?.price_adjustment || 0);
  const displayStock = selectedVariant ? selectedVariant.stock_quantity : product.stock_quantity;
  const reviews = product.reviews || [];
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews : 0;
  const ratingCounts = [5, 4, 3, 2, 1].map((star) => reviews.filter((r) => r.rating === star).length);
  const outOfStock = displayStock <= 0 || !product.in_stock;

  return (
    <main className={styles.main}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <ChevronRight size={13} />
        <Link href="/shop">Shop</Link>
        <ChevronRight size={13} />
        <Link href={`/shop?category=${encodeURIComponent(product.category)}`}>{product.category}</Link>
        <ChevronRight size={13} />
        <span aria-current="page" className={styles.breadcrumbCurrent}>{product.name}</span>
      </nav>

      <div className={styles.layout}>
        <div className={styles.imageColumn}>
          <div className={styles.imagePlaceholder}>
            <ProductImage
              src={displayImage}
              alt={product.name}
              sizes="(max-width: 900px) 100vw, 55vw"
              imageStyle={{ objectFit: 'cover' }}
              iconSize={64}
              showLabel
            />
            {discount && <span className={styles.discountBadge}>-{discount}% OFF</span>}
          </div>
        </div>

        <div className={styles.detailsColumn}>
          <span className={styles.category}>{product.category}</span>
          <h1 className={styles.title}>{product.name}</h1>

          <button type="button" className={styles.ratingRow} onClick={scrollToReviews}>
            {totalReviews > 0 ? (
              <>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill={i < Math.round(avgRating) ? '#F4A261' : 'none'} color={i < Math.round(avgRating) ? '#F4A261' : 'var(--text-secondary)'} />
                ))}
                <span className={styles.ratingCount}>{avgRating.toFixed(1)} · {totalReviews} review{totalReviews === 1 ? '' : 's'}</span>
              </>
            ) : (
              <span className={styles.ratingCount} style={{ marginLeft: 0 }}>No reviews yet</span>
            )}
          </button>

          <div className={styles.priceRow}>
            <span className={styles.price}>₹{displayPrice.toFixed(2)}</span>
            {product.compare_price && (
              <span className={styles.comparePrice}>₹{(product.compare_price + (selectedVariant?.price_adjustment || 0)).toFixed(2)}</span>
            )}
          </div>

          <p className={styles.description}>
            {product.description || 'Fresh from the farm. Sourced locally. Delivered straight to your door with care.'}
          </p>

          {product.product_variants && product.product_variants.length > 0 && (
            <div className={styles.variantSection}>
              <h4 className={styles.variantLabel}>Select Variant</h4>
              <div className={styles.variantList}>
                {product.product_variants.map((variant) => {
                  const active = selectedVariant?.id === variant.id;
                  return (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariant(variant)}
                      className={`${styles.variantBtn} ${active ? styles.variantBtnActive : ''}`}
                    >
                      {variant.image_url && (
                        <span className={styles.variantThumb}>
                          <ProductImage src={variant.image_url} alt={variant.name} sizes="30px" iconSize={14} imageStyle={{ objectFit: 'cover' }} />
                        </span>
                      )}
                      <span className={styles.variantName}>{variant.name}</span>
                      <span className={styles.variantPrice}>₹{(product.price + variant.price_adjustment).toFixed(2)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className={styles.buyBox}>
            <div className={styles.buyBoxPriceRow}>
              <span className={styles.buyBoxPrice}>₹{(displayPrice * quantity).toFixed(2)}</span>
              {quantity > 1 && <span className={styles.perItem}>(₹{displayPrice.toFixed(2)} / item)</span>}
            </div>

            <div className={styles.metaList}>
              <div className={styles.metaItem}>
                <span className={styles.metaIcon}><Truck size={16} /></span>
                <span>Free delivery on orders above ₹{FREE_DELIVERY_THRESHOLD}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaIcon}><Package size={16} /></span>
                <span>Easy 7-day replacement</span>
              </div>
            </div>

            <div className={outOfStock ? styles.stockBadgeOut : displayStock < 5 ? styles.stockBadgeLow : styles.stockBadgeIn}>
              <span className={styles.stockDot} />
              {outOfStock ? 'Out of Stock' : displayStock < 5 ? `Only ${displayStock} left` : 'In Stock'}
            </div>

            <hr className={styles.divider} />

            {outOfStock ? (
              <button className={`${styles.addBtn} ${styles.addBtnDisabled}`} disabled>
                Out of Stock
              </button>
            ) : (
              <div className={styles.buyBoxActions}>
                <div className={styles.stepper}>
                  <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className={styles.stepperBtn} aria-label="Decrease quantity">
                    <Minus size={15} />
                  </button>
                  <span className={styles.stepperValue}>{quantity}</span>
                  <button type="button" onClick={() => setQuantity(Math.min(displayStock, quantity + 1))} className={styles.stepperBtn} aria-label="Increase quantity">
                    <Plus size={15} />
                  </button>
                </div>

                {inCart ? (
                  <button onClick={() => router.push('/cart')} className={`${styles.addBtn} ${styles.addBtnFilled}`}>
                    <ShoppingCart size={18} />
                    Go to Cart
                  </button>
                ) : (
                  <button
                    onClick={handleAddToCart}
                    className={`${styles.addBtn} ${styles.addBtnOutline}`}
                    disabled={added}
                  >
                    <ShoppingCart size={18} />
                    {added ? 'Added!' : 'Add to Cart'}
                  </button>
                )}

                <button
                  onClick={() => {
                    if (!inCart) handleAddToCart();
                    router.push('/checkout');
                  }}
                  className={`${styles.addBtn} ${styles.addBtnFilled}`}
                >
                  Buy Now
                </button>
              </div>
            )}

            <button type="button" onClick={handleWishlist} className={styles.wishlistBtn}>
              <Heart size={17} fill={inWishlist ? 'currentColor' : 'none'} color={inWishlist ? '#B91C1C' : 'var(--text-secondary)'} />
              {inWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
            </button>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div ref={reviewsRef} className={styles.reviewsSection}>
        <h2 className={styles.reviewsHeading}>Customer Reviews</h2>

        <div className={styles.reviewsOverview}>
          <div className={styles.ratingSummaryCard}>
            <div className={styles.ratingBig}>{avgRating.toFixed(1)}</div>
            <div className={styles.ratingBigStars}>
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} fill={i < Math.round(avgRating) ? '#F4A261' : 'none'} color={i < Math.round(avgRating) ? '#F4A261' : 'var(--text-secondary)'} />
              ))}
            </div>
            <p className={styles.ratingBigCount}>{totalReviews} review{totalReviews === 1 ? '' : 's'}</p>
          </div>

          <div className={styles.ratingBreakdown}>
            {[5, 4, 3, 2, 1].map((star, idx) => {
              const count = ratingCounts[idx];
              const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              return (
                <div key={star} className={styles.breakdownRow}>
                  <span className={styles.breakdownLabel}>{star}★</span>
                  <div className={styles.breakdownTrack}>
                    <div className={styles.breakdownFill} style={{ width: `${pct}%` }} />
                  </div>
                  <span className={styles.breakdownCount}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {totalReviews > 0 ? (
          <div className={styles.reviewsList}>
            {reviews.map((review) => (
              <div key={review.id} className={styles.reviewCard}>
                <div className={styles.reviewAvatar}>{getInitials(review.profiles?.full_name || 'Anonymous User')}</div>
                <div className={styles.reviewBody}>
                  <div className={styles.reviewHeader}>
                    <strong>{review.profiles?.full_name || 'Anonymous User'}</strong>
                    <span className={styles.reviewDate}>{formatReviewDate(review.created_at)}</span>
                  </div>
                  <div className={styles.reviewStars}>
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={13} fill={i < review.rating ? '#F4A261' : 'none'} color={i < review.rating ? '#F4A261' : 'var(--text-secondary)'} />
                    ))}
                  </div>
                  {review.comment && <p className={styles.reviewComment}>{review.comment}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.noReviews}>No reviews yet. Be the first to review this product!</p>
        )}

        <hr className={styles.divider} />

        {!session ? (
          <Link href="/auth" className={styles.loginToReview}>Log in to write a review</Link>
        ) : (
          <div className={styles.reviewForm}>
            <h3 className={styles.reviewFormHeading}>Write a review</h3>
            <div className={styles.reviewFormStars} onMouseLeave={() => setHoverRating(0)}>
              {[...Array(5)].map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setMyRating(i + 1)}
                  onMouseEnter={() => setHoverRating(i + 1)}
                  className={styles.reviewFormStarBtn}
                  aria-label={`Rate ${i + 1} star`}
                >
                  <Star size={24} fill={i < (hoverRating || myRating) ? '#F4A261' : 'none'} color="#F4A261" />
                </button>
              ))}
            </div>
            <textarea
              value={myComment}
              onChange={(e) => setMyComment(e.target.value)}
              placeholder="Share your thoughts about this product (optional)"
              rows={3}
              className={styles.reviewTextarea}
            />
            {reviewError && <p className={styles.reviewError}>{reviewError}</p>}
            <button
              type="button"
              onClick={handleSubmitReview}
              disabled={submittingReview}
              className={`${styles.addBtn} ${styles.addBtnFilled}`}
              style={{ alignSelf: 'flex-start', opacity: submittingReview ? 0.7 : 1 }}
            >
              {submittingReview ? 'Submitting…' : 'Submit Review'}
            </button>
          </div>
        )}
      </div>

      <ScrollRow title="You might also like" products={related} />
      <ScrollRow title="Recently viewed" products={recentlyViewed} />

      {!outOfStock && (
        <div className={styles.mobileActionBar}>
          {inCart ? (
            <button onClick={() => router.push('/cart')} className={`${styles.addBtn} ${styles.addBtnFilled}`}>
              Go to Cart
            </button>
          ) : (
            <button onClick={handleAddToCart} className={`${styles.addBtn} ${styles.addBtnOutline}`}>
              Add to Cart
            </button>
          )}
          <button
            onClick={() => {
              if (!inCart) handleAddToCart();
              router.push('/checkout');
            }}
            className={`${styles.addBtn} ${styles.addBtnFilled}`}
          >
            Buy Now
          </button>
        </div>
      )}
    </main>
  );
}
