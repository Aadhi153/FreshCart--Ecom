import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './styles.css';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import Coupons from './pages/Coupons';
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
  '/coupons': 'Coupons',
  '/reviews': 'Reviews',
  '/settings': 'Settings',
};

function AdminLayout() {
  const location = useLocation();
  const { loading, session, isAdmin, signOut } = useAuth();
  const title = PAGE_TITLES[location.pathname] || (location.pathname.startsWith('/products/') ? 'Product Details' : 'Admin');

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

  return (
    <div className="admin-layout">
      <Sidebar />
      <main className="admin-main">
        <Topbar title={title} />
        <div className="admin-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/coupons" element={<Coupons />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<div style={{ padding: '2rem', color: 'var(--text-primary)' }}>Admin page not found – check your routes.</div>} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/*" element={<AdminLayout />} />
            </Routes>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </ToastProvider>
  );
}
