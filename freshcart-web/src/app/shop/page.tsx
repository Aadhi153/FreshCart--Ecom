'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { getCheapestVariant } from '../../lib/queries';
import { useCartStore, useWishlistStore } from '../../lib/store';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { useToast } from '../../components/ToastProvider';
import {
  filterProducts,
  sortProducts,
  getCategoryCounts,
  getPriceBucketCounts,
  PRICE_BUCKETS,
  type ProductCard,
  type ProductRow,
  type PriceBucketKey,
  type SortKey,
  type DietaryFilters,
} from './filters';
import { FilterBar } from './components/FilterBar';
import type { FilterChip } from './components/ActiveFilterChips';
import { FilterSidebar } from './components/FilterSidebar';
import { CartSidebar } from './components/CartSidebar';
import { ProductGrid } from './components/ProductGrid';
import styles from './page.module.css';

const DEFAULT_DIETARY: DietaryFilters = { vegetarian: false, vegan: false, organic: false };
const PAGE_SIZE = 24;

export default function ShopPage() {
  return (
    <Suspense fallback={<main className={styles.shopMain}>Loading products...</main>}>
      <ShopContent />
    </Suspense>
  );
}

function ShopContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [allProducts, setAllProducts] = useState<ProductCard[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);

  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceBucket, setPriceBucket] = useState<PriceBucketKey>('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [dietary, setDietary] = useState<DietaryFilters>(DEFAULT_DIETARY);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('popular');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [isFiltering, setIsFiltering] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const addItem = useCartStore((state) => state.addItem);
  const addWishlistItem = useWishlistStore((state) => state.addItem);
  const removeWishlistItem = useWishlistStore((state) => state.removeItem);
  const wishlistItems = useWishlistStore((state) => state.items);
  const { showToast } = useToast();

  const debouncedSearch = useDebouncedValue(search, 300);

  // Read initial filter state from the URL so filtered views are shareable/bookmarkable.
  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null) setSearch(q);
    const category = searchParams.get('category');
    if (category) setSelectedCategories(category.split(',').filter(Boolean));
    const price = searchParams.get('price') as PriceBucketKey | null;
    if (price && PRICE_BUCKETS.some((b) => b.key === price)) setPriceBucket(price);
    if (searchParams.get('inStock') === '1') setInStockOnly(true);
    if (searchParams.get('onSale') === '1') setOnSaleOnly(true);
    const dietaryParam = searchParams.get('dietary');
    if (dietaryParam) {
      const flags = new Set(dietaryParam.split(','));
      setDietary({
        vegetarian: flags.has('vegetarian'),
        vegan: flags.has('vegan'),
        organic: flags.has('organic'),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the URL in sync as filters change, without adding history entries.
  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (selectedCategories.length > 0) params.set('category', selectedCategories.join(','));
    if (priceBucket !== 'all') params.set('price', priceBucket);
    if (inStockOnly) params.set('inStock', '1');
    if (onSaleOnly) params.set('onSale', '1');
    const activeDietary = Object.entries(dietary).filter(([, v]) => v).map(([k]) => k);
    if (activeDietary.length > 0) params.set('dietary', activeDietary.join(','));

    const queryString = params.toString();
    router.replace(queryString ? `/shop?${queryString}` : '/shop', { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedCategories, priceBucket, inStockOnly, onSaleOnly, dietary]);

  const handleQuickAdd = async (product: ProductCard) => {
    const variant = await getCheapestVariant(product.id);
    const finalPrice = product.price + (variant?.priceAdjustment || 0);
    const name = variant ? `${product.name} - ${variant.name}` : product.name;
    addItem({
      id: variant ? `${product.id}-${variant.id}` : product.id,
      productId: product.id,
      variantId: variant?.id,
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
        .select('id, name, price, image_url, stock_quantity, in_stock, rating, review_count, created_at, is_vegetarian, is_vegan, is_organic, is_on_sale, categories(name)')
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
          is_vegetarian: p.is_vegetarian ?? false,
          is_vegan: p.is_vegan ?? false,
          is_organic: p.is_organic ?? false,
          is_on_sale: p.is_on_sale ?? false,
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
      filterProducts(allProducts, {
        search: debouncedSearch,
        categories: selectedCategories,
        priceBucket,
        inStockOnly,
        dietary,
        onSaleOnly,
      }),
      sortBy,
    ),
    [allProducts, debouncedSearch, selectedCategories, priceBucket, inStockOnly, dietary, onSaleOnly, sortBy],
  );

  const visibleProducts = useMemo(
    () => filteredProducts.slice(0, visibleCount),
    [filteredProducts, visibleCount],
  );

  // Each facet's counts are computed against every *other* active filter, so selecting
  // a category doesn't collapse that same category's own count to zero.
  const categoryCounts = useMemo(
    () => getCategoryCounts(allProducts, { search: debouncedSearch, priceBucket, inStockOnly, dietary, onSaleOnly }),
    [allProducts, debouncedSearch, priceBucket, inStockOnly, dietary, onSaleOnly],
  );
  const priceBucketCounts = useMemo(
    () => getPriceBucketCounts(allProducts, { search: debouncedSearch, categories: selectedCategories, inStockOnly, dietary, onSaleOnly }),
    [allProducts, debouncedSearch, selectedCategories, inStockOnly, dietary, onSaleOnly],
  );

  // Brief skeleton flash on filter change for visual polish (the actual computation above is instant).
  const [didMount, setDidMount] = useState(false);
  useEffect(() => {
    if (!didMount) {
      setDidMount(true);
      return;
    }
    setIsFiltering(true);
    const timeout = setTimeout(() => setIsFiltering(false), 150);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, selectedCategories, priceBucket, inStockOnly, dietary, onSaleOnly, sortBy]);

  // Reset pagination whenever the matched set changes, so "Load more" always starts
  // from the first page of the new result instead of an arbitrary offset.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [debouncedSearch, selectedCategories, priceBucket, inStockOnly, dietary, onSaleOnly, sortBy]);

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setPriceBucket('all');
    setInStockOnly(false);
    setDietary(DEFAULT_DIETARY);
    setOnSaleOnly(false);
    setSearch('');
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const handleDietaryChange = (key: keyof DietaryFilters, value: boolean) => {
    setDietary((prev) => ({ ...prev, [key]: value }));
  };

  // Count of filters scoped to the sidebar itself (search lives in the top bar and is
  // surfaced separately via its own chip/clear control).
  const activeFilterCount =
    selectedCategories.length +
    (priceBucket !== 'all' ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (dietary.vegetarian ? 1 : 0) +
    (dietary.vegan ? 1 : 0) +
    (dietary.organic ? 1 : 0) +
    (onSaleOnly ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0 || search.trim() !== '';

  const chips: FilterChip[] = [
    ...selectedCategories.map((category) => ({
      key: `category-${category}`,
      label: category,
      onRemove: () => toggleCategory(category),
    })),
    ...(priceBucket !== 'all'
      ? [{
          key: 'price',
          label: PRICE_BUCKETS.find((b) => b.key === priceBucket)?.label || '',
          onRemove: () => setPriceBucket('all'),
        }]
      : []),
    ...(inStockOnly ? [{ key: 'inStock', label: 'In stock only', onRemove: () => setInStockOnly(false) }] : []),
    ...(dietary.vegetarian ? [{ key: 'vegetarian', label: 'Vegetarian', onRemove: () => handleDietaryChange('vegetarian', false) }] : []),
    ...(dietary.vegan ? [{ key: 'vegan', label: 'Vegan', onRemove: () => handleDietaryChange('vegan', false) }] : []),
    ...(dietary.organic ? [{ key: 'organic', label: 'Organic', onRemove: () => handleDietaryChange('organic', false) }] : []),
    ...(onSaleOnly ? [{ key: 'onSale', label: 'On sale', onRemove: () => setOnSaleOnly(false) }] : []),
    ...(search.trim() ? [{ key: 'search', label: `"${search.trim()}"`, onRemove: () => setSearch('') }] : []),
  ];

  return (
    <main className={styles.shopMain}>
      <div className={styles.heroBand}>
        <span className={styles.heroEyebrow}>FreshCart store</span>
        <h1 className={styles.heroHeading}>Shop fresh essentials</h1>
        {!loading && !fetchError && (
          <p className={styles.heroCount}>
            {filteredProducts.length} product{filteredProducts.length === 1 ? '' : 's'} found
          </p>
        )}
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        chips={chips}
        onClearAll={clearAllFilters}
        sortBy={sortBy}
        onSortByChange={setSortBy}
      />

      <div className={styles.shopLayout}>
        <FilterSidebar
          categories={categories}
          categoryCounts={categoryCounts}
          selectedCategories={selectedCategories}
          onToggleCategory={toggleCategory}
          priceBucket={priceBucket}
          priceBucketCounts={priceBucketCounts}
          onPriceBucketChange={setPriceBucket}
          inStockOnly={inStockOnly}
          onInStockOnlyChange={setInStockOnly}
          dietary={dietary}
          onDietaryChange={handleDietaryChange}
          onSaleOnly={onSaleOnly}
          onOnSaleOnlyChange={setOnSaleOnly}
          hasActiveFilters={hasActiveFilters}
          activeFilterCount={activeFilterCount}
          onClearAll={clearAllFilters}
          mobileOpen={mobileFilterOpen}
          onMobileOpen={() => setMobileFilterOpen(true)}
          onMobileClose={() => setMobileFilterOpen(false)}
        />

        <section className={styles.productSection}>
          <ProductGrid
            products={visibleProducts}
            totalCount={filteredProducts.length}
            loading={loading}
            isFiltering={isFiltering}
            fetchError={fetchError}
            searchTerm={debouncedSearch}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
            onQuickAdd={handleQuickAdd}
            onClearFilters={clearAllFilters}
            onRetry={() => window.location.reload()}
            onLoadMore={() => setVisibleCount((c) => c + PAGE_SIZE)}
          />
        </section>

        <CartSidebar />
      </div>
    </main>
  );
}
