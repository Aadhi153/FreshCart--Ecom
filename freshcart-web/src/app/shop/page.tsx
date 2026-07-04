'use client';

import Link from 'next/link';
import { Suspense, useState, useEffect, useRef } from 'react';
import { Heart, Star, PackageSearch, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { getCheapestVariant } from '../../lib/queries';
import { useCartStore, useWishlistStore } from '../../lib/store';
import { gridVariants, itemVariants } from '../../lib/motion';
import { ProductCardSkeleton, EmptyState } from '../../components/Skeleton';
import { ProductImage } from '../../components/ProductImage';
import { useToast } from '../../components/ToastProvider';
import styles from './page.module.css';

const PAGE_SIZE = 24;

interface ProductRow {
  id: string;
  name: string;
  price: number | string;
  categories: { name: string } | null;
  image_url: string | null;
  stock_quantity: number;
  in_stock: boolean;
  rating: number | string | null;
  review_count: number | null;
}

interface ProductCard {
  id: string;
  name: string;
  price: number;
  category: string;
  image_url?: string;
  stock_quantity: number;
  in_stock: boolean;
  rating: number;
  review_count: number;
}

export default function ShopPage() {
  return (
    <Suspense fallback={<main className={styles.shopMain}>Loading products...</main>}>
      <ShopContent />
    </Suspense>
  );
}

function ShopContent() {
  const [products, setProducts] = useState<ProductCard[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [priceCeiling, setPriceCeiling] = useState(200);

  const searchParams = useSearchParams();
  const router = useRouter();

  const [search, setSearch] = useState('');

  // Momentum Scroll States & Refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const velocity = useRef(0);
  const lastTime = useRef(0);
  const lastX = useRef(0);
  const dragDistance = useRef(0);
  const frameId = useRef<number | null>(null);

  const checkFades = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftFade(scrollLeft > 0);
      setShowRightFade(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
    }
  };

  useEffect(() => {
    checkFades();
    window.addEventListener('resize', checkFades);
    return () => window.removeEventListener('resize', checkFades);
  }, [categories]);

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    isDown.current = true;
    dragDistance.current = 0;
    const container = scrollRef.current;
    if (!container) return;
    if (frameId.current) cancelAnimationFrame(frameId.current);
    
    const pageX = 'touches' in e ? e.touches[0].pageX : (e as React.MouseEvent).pageX;
    startX.current = pageX - container.offsetLeft;
    scrollLeft.current = container.scrollLeft;
    lastX.current = pageX;
    lastTime.current = performance.now();
    velocity.current = 0;
  };

  const handlePointerLeave = () => {
    if (isDown.current) {
      isDown.current = false;
      startMomentum();
      setTimeout(() => setIsDragging(false), 50);
    }
  };

  const handlePointerUp = () => {
    isDown.current = false;
    startMomentum();
    setTimeout(() => setIsDragging(false), 50);
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDown.current || !scrollRef.current) return;
    
    const pageX = 'touches' in e ? e.touches[0].pageX : (e as React.MouseEvent).pageX;
    const dxForDistance = Math.abs(pageX - lastX.current);
    dragDistance.current += dxForDistance;
    
    if (dragDistance.current > 5 && !isDragging) {
      setIsDragging(true);
    }
    
    const x = pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current);
    scrollRef.current.scrollLeft = scrollLeft.current - walk;
    
    const now = performance.now();
    const dt = now - lastTime.current;
    if (dt > 0) {
      const dx = pageX - lastX.current;
      velocity.current = dx / dt;
    }
    
    lastX.current = pageX;
    lastTime.current = now;
    checkFades();
  };

  const startMomentum = () => {
    if (!scrollRef.current || Math.abs(velocity.current) < 0.1) return;
    
    const step = () => {
      if (!scrollRef.current) return;
      
      scrollRef.current.scrollLeft -= velocity.current * 16;
      velocity.current *= 0.92;
      
      checkFades();
      
      if (Math.abs(velocity.current) > 0.05) {
        frameId.current = requestAnimationFrame(step);
      }
    };
    
    frameId.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    const q = searchParams.get('q');
    setSearch(q !== null ? q : '');
    const category = searchParams.get('category');
    if (category) setSelectedCategory(category);
    setPage(1);
  }, [searchParams]);

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState('popular');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const addItem = useCartStore((state) => state.addItem);
  const addWishlistItem = useWishlistStore((state) => state.addItem);
  const removeWishlistItem = useWishlistStore((state) => state.removeItem);
  const wishlistItems = useWishlistStore((state) => state.items);
  const { showToast } = useToast();

  const handleQuickAdd = async (product: ProductCard) => {
    const variant = await getCheapestVariant(product.id);
    const finalPrice = product.price + (variant?.priceAdjustment || 0);
    const name = variant ? `${product.name} - ${variant.name}` : product.name;
    addItem({
      id: variant ? `${product.id}-${variant.id}` : product.id,
      productId: product.id,
      name,
      price: finalPrice,
      image: variant?.image || product.image_url,
      category: product.category,
    });
    showToast(`${name} added to cart`, 'success');
  };

  // Category list and price ceiling come from dedicated lightweight queries so the
  // sidebar doesn't depend on fetching the whole (now paginated) product set.
  useEffect(() => {
    async function fetchFilters() {
      const [{ data: categoryRows }, { data: priceRows }] = await Promise.all([
        supabase.from('categories').select('name').order('name'),
        supabase.from('products').select('price').order('price', { ascending: false }).limit(1),
      ]);
      if (categoryRows) setCategories(['All', ...categoryRows.map(c => c.name)]);
      if (priceRows && priceRows[0]) setPriceCeiling(Math.max(200, Math.ceil(Number(priceRows[0].price))));
    }
    fetchFilters();
  }, []);

  const effectiveMaxPrice = maxPrice ?? priceCeiling;

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      setFetchError('');

      // Filtering by category requires an inner join so the embed actually restricts
      // the parent rows; left-joining (the "All" case) keeps uncategorized products visible.
      const categorySelect = selectedCategory !== 'All' ? 'categories!inner(name)' : 'categories(name)';
      let query = supabase
        .from('products')
        .select(`id, name, price, image_url, stock_quantity, in_stock, rating, review_count, ${categorySelect}`, { count: 'exact' });

      if (search) query = query.ilike('name', `%${search}%`);
      if (selectedCategory !== 'All') query = query.eq('categories.name', selectedCategory);
      query = query.lte('price', effectiveMaxPrice);

      if (sortBy === 'price-low') {
        query = query.order('price', { ascending: true });
      } else if (sortBy === 'price-high') {
        query = query.order('price', { ascending: false });
      } else {
        query = query.order('review_count', { ascending: false, nullsFirst: false });
      }

      const from = (page - 1) * PAGE_SIZE;
      const { data: prodData, error, count } = await query
        .range(from, from + PAGE_SIZE - 1)
        .returns<ProductRow[]>();

      if (cancelled) return;

      if (prodData && !error) {
        const mapped = prodData.map(p => ({
          id: p.id,
          name: p.name,
          price: Number(p.price),
          category: p.categories?.name || 'Uncategorized',
          image_url: p.image_url || undefined,
          stock_quantity: p.stock_quantity ?? 0,
          in_stock: p.in_stock ?? true,
          rating: Number(p.rating) || 0,
          review_count: p.review_count ?? 0,
        }));
        setProducts(mapped);
        setTotalCount(count ?? mapped.length);
      } else {
        setFetchError(error?.message || 'Failed to load products.');
      }
      setLoading(false);
    }
    fetchData();
    return () => { cancelled = true; };
  }, [search, selectedCategory, effectiveMaxPrice, sortBy, page]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <main className={styles.shopMain}>
      <div className={styles.shopBackdrop} aria-hidden="true">
        <span className={`${styles.meshOrb} ${styles.meshOrbOne}`} />
        <span className={`${styles.meshOrb} ${styles.meshOrbTwo}`} />
        <span className={`${styles.meshOrb} ${styles.meshOrbThree}`} />
        <span className={styles.gridGlow} />
      </div>

      <div className={styles.categoryBarWrapper}>
        <div className={`${styles.fadeEdge} ${styles.fadeLeft} ${showLeftFade ? styles.fadeVisible : ''}`} />
        <div
          className={styles.categoryBar}
          ref={scrollRef}
          onMouseDown={handlePointerDown}
          onMouseLeave={handlePointerLeave}
          onMouseUp={handlePointerUp}
          onMouseMove={handlePointerMove}
          onTouchStart={handlePointerDown}
          onTouchEnd={handlePointerUp}
          onTouchCancel={handlePointerLeave}
          onTouchMove={handlePointerMove}
          onScroll={checkFades}
        >
          {categories.map(cat => (
            <button
              key={cat}
              onClick={(e) => {
                if (isDragging) {
                  e.preventDefault();
                  e.stopPropagation();
                  return;
                }
                setSelectedCategory(cat);
                setPage(1);
              }}
              className={`${styles.categoryChip} ${selectedCategory === cat ? styles.categoryChipActive : ''}`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className={`${styles.fadeEdge} ${styles.fadeRight} ${showRightFade ? styles.fadeVisible : ''}`} />
      </div>

      <div className={styles.shopGrid}>
      <aside className={styles.sidebar}>
        <div>
          <h3>Filters</h3>
          <div className={styles.filterGroup}>
            <label>Max Price: ₹{effectiveMaxPrice}</label>
            <input
              type="range"
              min="0"
              max={priceCeiling}
              value={effectiveMaxPrice}
              onChange={(e) => { setMaxPrice(Number(e.target.value)); setPage(1); }}
            />
          </div>
        </div>
      </aside>

      <section className={styles.productSection}>
        <div className={styles.shopHeader}>
          <div>
            <span>FreshCart Store</span>
            <h1>Shop fresh essentials</h1>
            <p>{totalCount} products available{search ? ` for "${search}"` : ''}</p>
          </div>

          <div className={styles.searchBar}>
            <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }}>
              <option value="popular">Sort by: Popular</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        <motion.div
          className={styles.productGrid}
          variants={gridVariants}
          initial="hidden"
          animate="show"
        >
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)
          ) : fetchError ? (
            <EmptyState
              icon={<AlertCircle size={24} />}
              heading="Couldn't load products"
              subtext={fetchError}
              ctaLabel="Retry"
              ctaOnClick={() => window.location.reload()}
            />
          ) : products.length === 0 ? (
            <EmptyState
              icon={<PackageSearch size={24} />}
              heading={search ? `No products found for "${search}"` : 'No products found'}
              subtext="Try adjusting your search or filters."
              ctaLabel="Clear Search"
              ctaOnClick={() => router.push('/shop')}
            />
          ) : (
            products.map(product => (
              <motion.div
                key={product.id}
                className={styles.productCard}
                variants={itemVariants}
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.99 }}
              >

                {/* Wishlist Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const inWishlist = wishlistItems.some((item) => item.id === product.id);
                    if (inWishlist) {
                      removeWishlistItem(product.id);
                      showToast('Removed from wishlist', 'success');
                      return;
                    }

                    addWishlistItem({
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      category: product.category,
                      image: product.image_url,
                    });
                    showToast('Added to wishlist', 'success');
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
                    color: wishlistItems.some((item) => item.id === product.id) ? '#B91C1C' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  }}
                >
                  <Heart size={14} fill={wishlistItems.some((item) => item.id === product.id) ? 'currentColor' : 'none'} />
                </button>

                <Link href={`/shop/${product.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>

                  {/* Image */}
                  <div className={styles.productImageContainer}>
                    <ProductImage
                      src={product.image_url}
                      alt={product.name}
                      sizes="(max-width: 520px) 50vw, (max-width: 900px) 33vw, 170px"
                      imageStyle={{ objectFit: 'contain' }}
                    />
                  </div>

                  {/* Info */}
                  <div className={styles.productInfo}>
                    <h3 style={{ fontSize: '0.88rem', margin: '0', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.name}</h3>

                    {/* Ratings */}
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

                    {/* Price and Stock */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 'auto' }}>
                      <span className="price" style={{ fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--text-primary)' }}>₹{product.price.toFixed(2)}</span>
                    </div>
                  </div>
                </Link>

                {/* Add to Cart (Outside the Link to avoid invalid HTML) */}
                <div style={{ padding: '0 0.7rem 0.7rem 0.7rem' }}>
                  {product.stock_quantity > 0 && product.in_stock ? (
                    <button
                      className={styles.addToCartBtn}
                      style={{ margin: 0 }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleQuickAdd(product);
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
            ))
          )}
        </motion.div>

        {!loading && !fetchError && totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              type="button"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className={styles.pageButton}
            >
              Previous
            </button>
            <span className={styles.pageStatus}>Page {page} of {totalPages}</span>
            <button
              type="button"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={styles.pageButton}
            >
              Next
            </button>
          </div>
        )}
      </section>
      </div>
    </main>
  );
}
