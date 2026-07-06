'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import type { Session } from '@supabase/supabase-js';
import { Heart, LogOut, MapPin, Moon, Package, ShoppingCart, Sun, User, Leaf, Menu, Search, X } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { useCartStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { cartBumpVariants } from '../lib/motion';
import { NotificationBell } from './NotificationBell';

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const accountRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cartItems = useCartStore((state) => state.items);
  const cartHasHydrated = useCartStore((state) => state.hasHydrated);
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const [cartBump, setCartBump] = useState(false);
  const prevCartCountRef = useRef(cartCount);
  const hasSyncedAfterHydration = useRef(false);

  useEffect(() => {
    // Zustand's persisted cart starts at 0 items before rehydrating from
    // localStorage, so a non-empty cart jumping to its real count on load
    // would otherwise read as an "increase" and fire a false bounce. Skip
    // the first post-hydration run to just record the real count.
    if (!cartHasHydrated) return;
    if (!hasSyncedAfterHydration.current) {
      hasSyncedAfterHydration.current = true;
      prevCartCountRef.current = cartCount;
      return;
    }
    if (cartCount > prevCartCountRef.current) {
      setCartBump(true);
      const timeout = setTimeout(() => setCartBump(false), 550);
      prevCartCountRef.current = cartCount;
      return () => clearTimeout(timeout);
    }
    prevCartCountRef.current = cartCount;
  }, [cartCount, cartHasHydrated]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setAccountOpen(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
      if (!searchContainerRef.current?.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Live search functionality
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      const { data } = await supabase
        .from('products')
        .select('id, name, price, image_url, stock_quantity, in_stock')
        .ilike('name', `%${searchQuery}%`)
        .limit(5);
      
      setSearchResults(data || []);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const accountItems = [
    { href: '/profile', label: 'Profile', icon: User },
    { href: '/orders', label: 'Orders', icon: Package },
    { href: '/address', label: 'Address', icon: MapPin },
    { href: '/wishlist', label: 'Wishlist', icon: Heart },
  ];

  const handleAccountClick = () => {
    if (!session) {
      router.push('/auth');
      return;
    }

    setAccountOpen((open) => !open);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAccountOpen(false);
    router.push('/auth');
  };

  const iconBtnStyle: CSSProperties = {
    background: 'transparent',
    border: '1.5px solid var(--border-color)',
    cursor: 'pointer',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 'var(--radius-sm)',
    transition: 'all 0.2s',
    textDecoration: 'none',
    position: 'relative' as const,
  };

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 200,
      background: 'var(--topbar-bg)',
      borderBottom: '1px solid var(--topbar-border)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 2rem',
        height: 64,
      }}>
        {/* Logo + nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: 32, height: 32,
              background: 'var(--gradient-primary)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Leaf size={18} color="#fff" />
            </div>
            <span style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.02em',
            }}>
              FreshCart
            </span>
          </Link>

          <nav className="desktop-nav" style={{ display: 'flex', gap: '1.5rem' }}>
            <Link href="/" className="nav-link">Home</Link>
            <Link href="/shop" className="nav-link">Shop</Link>
            <Link href="/about" className="nav-link">About</Link>
            <Link href="/contact" className="nav-link">Contact Us</Link>
          </nav>
        </div>

        {/* Action icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Expandable Search */}
          <div ref={searchContainerRef} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              position: 'relative',
              background: searchOpen ? 'var(--layer-1)' : 'transparent',
              border: searchOpen ? '1.5px solid var(--primary-light)' : '1.5px solid var(--border-color)',
              borderRadius: searchOpen ? 'var(--radius-full)' : 'var(--radius-sm)',
              transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              width: searchOpen ? '260px' : '36px',
              height: '36px',
              overflow: 'hidden',
              boxShadow: searchOpen ? '0 0 0 3px rgba(46, 160, 67, 0.1)' : 'none',
            }}>
              <button
                type="button"
                onClick={() => {
                  if (!searchOpen) {
                    setSearchOpen(true);
                    setTimeout(() => searchInputRef.current?.focus(), 100);
                  } else if (searchQuery.trim()) {
                    router.push(`/shop?q=${encodeURIComponent(searchQuery)}`);
                  }
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: searchOpen ? 'var(--primary)' : 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                  position: 'absolute',
                  left: 0,
                  zIndex: 2,
                  transition: 'color 0.2s',
                }}
                title="Search"
                aria-label="Search"
              >
                <Search size={17} />
              </button>
              
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    router.push(`/shop?q=${encodeURIComponent(searchQuery)}`);
                    setSearchOpen(false);
                  }
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  background: 'transparent',
                  paddingLeft: '36px',
                  paddingRight: searchOpen ? '36px' : '0',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  opacity: searchOpen ? 1 : 0,
                  transition: 'opacity 0.3s ease 0.1s',
                  fontSize: '0.9rem',
                  pointerEvents: searchOpen ? 'auto' : 'none',
                }}
              />

              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQuery('');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                  position: 'absolute',
                  right: 0,
                  zIndex: 2,
                  opacity: searchOpen ? 1 : 0,
                  pointerEvents: searchOpen ? 'auto' : 'none',
                  transition: 'opacity 0.2s ease',
                }}
                title="Close"
                aria-label="Close search"
              >
                <X size={15} color="var(--text-secondary)" />
              </button>
            </div>

            {/* Live Search Results Dropdown */}
            {searchOpen && searchQuery.trim() && (
              <div style={{
                position: 'absolute',
                top: 46,
                right: 0,
                width: '320px',
                background: 'var(--layer-0)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 300,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}>
                {isSearching ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Searching...
                  </div>
                ) : searchResults.length > 0 ? (
                  <>
                    {searchResults.map(product => (
                      <Link
                        key={product.id}
                        href={`/shop/${product.id}`}
                        onClick={() => {
                          setSearchOpen(false);
                          setSearchQuery('');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem 1rem',
                          textDecoration: 'none',
                          color: 'var(--text-primary)',
                          borderBottom: '1px solid var(--border-color)',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--layer-1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{
                          width: 40, height: 40,
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--layer-2)',
                          backgroundImage: product.image_url ? `url(${product.image_url})` : 'none',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          flexShrink: 0
                        }} />
                        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {product.name}
                          </span>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.1rem' }}>
                            <span style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '0.85rem' }}>
                              ₹{Number(product.price).toFixed(2)}
                            </span>
                            { (product.stock_quantity <= 0 || !product.in_stock) && (
                              <span style={{ fontSize: '0.7rem', color: '#B91C1C', backgroundColor: '#FEE2E2', padding: '0.1rem 0.3rem', borderRadius: '4px', fontWeight: 'bold' }}>
                                Out of Stock
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                    <button
                      onClick={() => {
                        router.push(`/shop?q=${encodeURIComponent(searchQuery)}`);
                        setSearchOpen(false);
                      }}
                      style={{
                        padding: '0.75rem',
                        background: 'transparent',
                        border: 'none',
                        borderTop: '1px solid var(--border-color)',
                        color: 'var(--primary)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'center',
                        fontSize: '0.9rem',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--layer-1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      View all results for "{searchQuery}"
                    </button>
                  </>
                ) : (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    No products found for "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Theme toggle */}
          <button onClick={toggleTheme} style={iconBtnStyle} title={theme === 'dark' ? 'Light mode' : 'Dark mode'} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Auth / profile */}
          <div ref={accountRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={handleAccountClick}
              style={iconBtnStyle}
              title={session ? 'Account menu' : 'Sign in'}
              aria-label={session ? 'Account menu' : 'Sign in'}
              aria-haspopup={session ? 'menu' : undefined}
              aria-expanded={session ? accountOpen : undefined}
            >
              <User size={17} />
            </button>

            {session && accountOpen && (
              <div
                role="menu"
                style={{
                  position: 'absolute',
                  top: 46,
                  right: 0,
                  width: 190,
                  padding: '0.45rem',
                  background: 'var(--layer-0)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 300,
                }}
              >
                {accountItems.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setAccountOpen(false)}
                    role="menuitem"
                    className="dropdown-item"
                  >
                    <Icon size={16} />
                    {label}
                  </Link>
                ))}

                <button
                  type="button"
                  onClick={handleLogout}
                  role="menuitem"
                  className="dropdown-item"
                  style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.25rem', borderRadius: '0 0 var(--radius-sm) var(--radius-sm)' }}
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>

          <NotificationBell session={session} iconBtnStyle={iconBtnStyle} />

          {/* Cart */}
          <motion.div
            variants={cartBumpVariants}
            animate={cartBump ? 'bump' : 'idle'}
            style={{ display: 'inline-flex' }}
          >
            <Link href="/cart" style={{ ...iconBtnStyle, position: 'relative' }} title="Cart" aria-label={`Cart, ${cartCount} item${cartCount === 1 ? '' : 's'}`}>
              <ShoppingCart size={17} />
              {cartCount > 0 && (
                <span style={{
                  position: 'absolute', top: -6, right: -6,
                  background: 'var(--gradient-primary)',
                  color: '#fff',
                  fontSize: '0.62rem', fontWeight: 800,
                  borderRadius: '50%', width: 18, height: 18,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                }}>
                  {cartCount}
                </span>
              )}
            </Link>
          </motion.div>

          {/* Mobile hamburger */}
          <button
            className="mobile-menu"
            style={{ ...iconBtnStyle, display: 'none' }}
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <nav className="mobile-nav-drawer" aria-label="Mobile navigation">
          <Link href="/" onClick={() => setMobileMenuOpen(false)}>Home</Link>
          <Link href="/shop" onClick={() => setMobileMenuOpen(false)}>Shop</Link>
          <Link href="/about" onClick={() => setMobileMenuOpen(false)}>About</Link>
          <Link href="/contact" onClick={() => setMobileMenuOpen(false)}>Contact Us</Link>
        </nav>
      )}
    </header>
  );
}
