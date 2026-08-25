import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Tag,
  Star,
  Settings,
  LogOut,
  Leaf,
  RotateCcw,
  ChevronsLeft,
} from 'lucide-react';
import { useAuth } from './AuthProvider';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/products', label: 'Products', icon: Package },
  { path: '/orders', label: 'Orders', icon: ShoppingBag },
  { path: '/returns', label: 'Returns', icon: RotateCcw },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/promotions', label: 'Promotions', icon: Tag },
  { path: '/reviews', label: 'Reviews', icon: Star },
  { path: '/settings', label: 'Settings', icon: Settings },
];

const COLLAPSED_WIDTH = '76px';
const EXPANDED_WIDTH = '224px';

export default function Sidebar() {
  const { signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('admin-sidebar-collapsed') === '1');

  // The modal overlay and a couple of layout calcs read this custom property
  // from the root, so the collapse toggle has to update it there, not just
  // resize the <aside> itself.
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--admin-sidebar-width',
      collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH
    );
    localStorage.setItem('admin-sidebar-collapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  return (
    <motion.aside
      className="admin-sidebar"
      animate={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="admin-sidebar-header" style={{ justifyContent: collapsed ? 'center' : 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
          <motion.div
            whileHover={{ rotate: -8, scale: 1.06 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            style={{
              width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
              background: 'var(--sidebar-logo-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
            }}
          >
            <Leaf size={20} color="#fff" />
          </motion.div>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.18 }}
              style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
            >
              <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--sidebar-wordmark)', fontFamily: 'var(--font-display)' }}>
                FreshCart
              </h2>
              <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--sidebar-subtext)' }}>Admin Portal</p>
            </motion.div>
          )}
        </div>
      </div>

      <nav className="admin-nav" style={{ flex: 1 }}>
        {navItems.map(({ path, label, icon: Icon, exact }, i) => (
          <motion.div
            key={path}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: i * 0.035, ease: [0.4, 0, 0.2, 1] }}
          >
            <NavLink
              to={path}
              end={exact}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `admin-nav-item${isActive ? ' active' : ''}${collapsed ? ' collapsed' : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="admin-nav-active-pill"
                      className="admin-nav-active-pill"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <Icon size={18} className="admin-nav-icon" style={{ marginRight: collapsed ? 0 : '0.75rem', flexShrink: 0 }} />
                  {!collapsed && <span className="admin-nav-label">{label}</span>}
                </>
              )}
            </NavLink>
          </motion.div>
        ))}
      </nav>

      <div style={{ padding: collapsed ? '0.75rem' : '0.75rem 1.5rem', borderTop: '1px solid var(--sidebar-border)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <button
          className="admin-collapse-toggle"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <motion.span
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ duration: 0.25 }}
            style={{ display: 'inline-flex' }}
          >
            <ChevronsLeft size={18} />
          </motion.span>
          {!collapsed && <span>Collapse</span>}
        </button>

        <button
          className={`admin-nav-item${collapsed ? ' collapsed' : ''}`}
          onClick={() => void signOut()}
          title={collapsed ? 'Sign Out' : undefined}
          style={{ background: 'none', border: 'none', textAlign: 'left', color: 'var(--sidebar-danger)', cursor: 'pointer', padding: '0.7rem 0.75rem' }}
        >
          <LogOut size={18} style={{ marginRight: collapsed ? 0 : '0.75rem' }} />
          {!collapsed && 'Sign Out'}
        </button>
      </div>
    </motion.aside>
  );
}
