'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { getCheapestVariant } from '../../lib/queries';
import { useCartStore, useWishlistStore } from '../../lib/store';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { useToast } from '../../components/ToastProvider';
import {
  filterProducts,
  sortProducts,
  type ProductCard,
  type ProductRow,
  type PriceBucketKey,
  type SortKey,
} from './filters';
import { FilterBar } from './components/FilterBar';
import { ProductGrid } from './components/ProductGrid';
import styles from './page.module.css';

export default function ShopPage() {
  return (
    <Suspense fallback={<main className={styles.shopMain}>Loading products...</main>}>
      <ShopContent />
    </Suspense>
  );
}

function ShopContent() {
  const [allProducts, setAllProducts] = useState<ProductCard[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);

  const searchParams = useSearchParams();

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
    if (q !== null) setSearch(q);
    const category = searchParams.get('category');
    if (category) setSelectedCategory(category);
  }, [searchParams]);

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [priceBucket, setPriceBucket] = useState<PriceBucketKey>('all');
  const [sortBy, setSortBy] = useState<SortKey>('popular');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [isFiltering, setIsFiltering] = useState(false);

  const addItem = useCartStore((state) => state.addItem);
  const addWishlistItem = useWishlistStore((state) => state.addItem);
  const removeWishlistItem = useWishlistStore((state) => state.removeItem);
  const wishlistItems = useWishlistStore((state) => state.items);
  const { showToast } = useToast();

  const debouncedSearch = useDebouncedValue(search, 300);

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

  const handleToggleWishlist = (product: ProductCard) => {
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
  };

  const wishlistIds = useMemo(() => new Set(wishlistItems.map((item) => item.id)), [wishlistItems]);

  // Category list comes from its own lightweight query, decoupled from the product fetch.
  useEffect(() => {
    async function fetchCategories() {
      const { data: categoryRows } = await supabase.from('categories').select('name').order('name');
      if (categoryRows) setCategories(['All', ...categoryRows.map((c) => c.name)]);
    }
    fetchCategories();
  }, []);

  // The entire catalog is fetched once — every filter/sort/search from here on is a
  // pure in-memory operation with zero further network calls.
  useEffect(() => {
    let cancelled = false;
    async function fetchAllProducts() {
      setLoading(true);
      setFetchError('');

      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, image_url, stock_quantity, in_stock, rating, review_count, created_at, categories(name)')
        .returns<ProductRow[]>();

      if (cancelled) return;

      if (data && !error) {
        setAllProducts(data.map((p) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price),
          category: p.categories?.name || 'Uncategorized',
          image_url: p.image_url || undefined,
          stock_quantity: p.stock_quantity ?? 0,
          in_stock: p.in_stock ?? true,
          rating: Number(p.rating) || 0,
          review_count: p.review_count ?? 0,
          created_at: p.created_at,
        })));
      } else {
        setFetchError(error?.message || 'Failed to load products.');
      }
      setLoading(false);
    }
    fetchAllProducts();
    return () => { cancelled = true; };
  }, []);

  const filteredProducts = useMemo(
    () => sortProducts(
      filterProducts(allProducts, { search: debouncedSearch, category: selectedCategory, priceBucket }),
      sortBy,
    ),
    [allProducts, debouncedSearch, selectedCategory, priceBucket, sortBy],
  );

  // Brief skeleton flash on filter change for visual polish (the actual computation above is instant).
  const didMountRef = useRef(false);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    setIsFiltering(true);
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => setIsFiltering(false), 150);
    return () => { if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current); };
  }, [debouncedSearch, selectedCategory, priceBucket, sortBy]);

  const clearAllFilters = () => {
    setSelectedCategory('All');
    setPriceBucket('all');
    setSearch('');
  };

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
              }}
              className={`${styles.categoryChip} ${selectedCategory === cat ? styles.categoryChipActive : ''}`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className={`${styles.fadeEdge} ${styles.fadeRight} ${showRightFade ? styles.fadeVisible : ''}`} />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        selectedCategory={selectedCategory}
        onClearCategory={() => setSelectedCategory('All')}
        priceBucket={priceBucket}
        onPriceBucketChange={setPriceBucket}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        onClearAll={clearAllFilters}
      />

      <section className={styles.productSection}>
        <div className={styles.shopHeader}>
          <div>
            <span>FreshCart Store</span>
            <h1>Shop fresh essentials</h1>
          </div>
        </div>

        <ProductGrid
          products={filteredProducts}
          loading={loading}
          isFiltering={isFiltering}
          fetchError={fetchError}
          searchTerm={debouncedSearch}
          wishlistIds={wishlistIds}
          onToggleWishlist={handleToggleWishlist}
          onQuickAdd={handleQuickAdd}
          onClearFilters={clearAllFilters}
          onRetry={() => window.location.reload()}
        />
      </section>
    </main>
  );
}
