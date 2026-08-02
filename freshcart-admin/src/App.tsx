import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { queryClient } from './lib/queryClient';
import './styles.css';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import ProductNew from './pages/ProductNew';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import Promotions from './pages/Promotions';
import PromotionNew from './pages/PromotionNew';
import Reviews from './pages/Reviews';
import Settings from './pages/Settings';
import Auth from './pages/Auth';
import { ThemeProvider } from './components/ThemeProvider';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { ToastProvider } from './components/ToastProvider';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/products': 'Products',
  '/orders': 'Orders',
  '/customers': 'Customers',
  '/promotions': 'Promotions',
  '/reviews': 'Reviews',
  '/settings': 'Settings',
};

// Only the full-page create flows (Add Product / Add Promotion) get an
// animated in/out transition — the rest of the app's navigation is
// intentionally left instant, matching the existing (unanimated) list/detail
// pages instead of re-animating everything under AdminShell.
const ANIMATED_FULL_PAGE_ROUTES = new Set(['/products/new', '/promotions/new']);

const pageTransition = {
  initial: { opacity: 0, x: '100%' },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: '100%' },
  transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const },
};

// Shared shell for every authenticated admin route: persistent sidebar +
// a main column that child routes render into via <Outlet/>. Standard pages
// additionally get the generic Topbar (see StandardPage below); full-page
// flows like ProductNew/PromotionNew render directly into <Outlet/> with their
// own header so they can scroll independently and don't show a duplicate title bar.
function AdminShell() {
  const location = useLocation();
  const { loading, session, isAdmin, signOut } = useAuth();

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-loading-mark" />
        <span>Loading admin...</span>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  if (!isAdmin) {
    return (
      <div className="admin-loading">
        <span>Your account doesn't have admin access.</span>
        <button onClick={() => signOut()}>Sign out</button>
      </div>
    );
  }

  const isAnimatedFullPage = ANIMATED_FULL_PAGE_ROUTES.has(location.pathname);

  return (
    <div className="admin-layout">
      <Sidebar />
      <main className="admin-main">
        <AnimatePresence mode="wait">
          {isAnimatedFullPage ? (
            <motion.div
              key={location.pathname}
              className="pf-page-transition"
              initial={pageTransition.initial}
              animate={pageTransition.animate}
              exit={pageTransition.exit}
              transition={pageTransition.transition}
            >
              <Outlet />
            </motion.div>
          ) : (
            <Outlet />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function StandardPage() {
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] || (location.pathname.startsWith('/products/') ? 'Product Details' : 'Admin');

  return (
    <>
      <Topbar title={title} />
      <div className="admin-content">
        <Outlet />
      </div>
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ThemeProvider>
          <AuthProvider>
            <Router>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={<AdminShell />}>
                  <Route element={<StandardPage />}>
                    <Route index element={<Dashboard />} />
                    <Route path="products" element={<Products />} />
                    <Route path="products/:id" element={<ProductDetail />} />
                    <Route path="orders" element={<Orders />} />
                    <Route path="customers" element={<Customers />} />
                    <Route path="promotions" element={<Promotions />} />
                    <Route path="reviews" element={<Reviews />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="*" element={<div style={{ padding: '2rem', color: 'var(--text-primary)' }}>Admin page not found – check your routes.</div>} />
                  </Route>
                  <Route path="products/new" element={<ProductNew />} />
                  <Route path="promotions/new" element={<PromotionNew />} />
                </Route>
              </Routes>
            </Router>
          </AuthProvider>
        </ThemeProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
