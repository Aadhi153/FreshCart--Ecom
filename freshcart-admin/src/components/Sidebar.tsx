import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Settings,
  LogOut,
  Leaf
} from 'lucide-react';
import { useAuth } from './AuthProvider';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/products', label: 'Products', icon: Package },
  { path: '/orders', label: 'Orders', icon: ShoppingBag },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const { signOut } = useAuth();

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '10px',
            backgroundColor: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Leaf size={20} color="#fff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary)', fontFamily: 'var(--font-display)' }}>
              FreshCart
            </h2>
            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Admin Portal</p>
          </div>
        </div>
      </div>

      <nav className="admin-nav" style={{ flex: 1 }}>
        {navItems.map(({ path, label, icon: Icon, exact }) => (
          <NavLink
            key={path}
            to={path}
            end={exact}
            className={({ isActive }) =>
              `admin-nav-item${isActive ? ' active' : ''}`
            }
          >
            <Icon size={18} style={{ marginRight: '0.75rem', flexShrink: 0 }} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)' }}>
        <button
          className="admin-nav-item"
          onClick={() => void signOut()}
          style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', color: '#E63946', cursor: 'pointer' }}
        >
          <LogOut size={18} style={{ marginRight: '0.75rem' }} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
