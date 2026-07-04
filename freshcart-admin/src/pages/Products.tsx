import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductFormModal from '../components/ProductFormModal';
import { getProducts, deleteProduct, getCategories, getProductSoldQuantities } from '../lib/api';
import type { Product, Category } from '@freshcart/types';
import { Edit2, Trash2, Plus, RefreshCw, Search, Package, Layers, IndianRupee, Download } from 'lucide-react';
import { useToast } from '../components/ToastProvider';
import { exportToCsv } from '../lib/csv';

export default function Products() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [soldQuantities, setSoldQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchProducts();
    getCategories().then(setCategories).catch(err => console.error('Error fetching categories:', err));
    const interval = setInterval(fetchProducts, 30000); // refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  async function fetchProducts() {
    try {
      setLoading(true);
      const data = await getProducts();
      setProducts(data);
      const sold = await getProductSoldQuantities();
      setSoldQuantities(sold);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenModal = (product?: Product) => {
    setEditingProduct(product ?? null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => { setIsModalOpen(false); setEditingProduct(null); };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this product permanently?')) return;
    try {
      await deleteProduct(id);
      setProducts(products.filter(p => p.id !== id));
      showToast('Product deleted', 'success');
    } catch (error) {
      console.error('Error deleting product:', error);
      showToast('Failed to delete product.', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.size} product(s) permanently?`)) return;
    try {
      await Promise.all([...selectedIds].map(id => deleteProduct(id)));
      setProducts(prev => prev.filter(p => !selectedIds.has(p.id!)));
      setSelectedIds(new Set());
      showToast(`${selectedIds.size} product(s) deleted`, 'success');
    } catch (error) {
      console.error('Error bulk deleting products:', error);
      showToast('Some products failed to delete.', 'error');
    }
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter(p => {
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
      const matchesCategory = categoryFilter === 'all' || p.category_id === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, categoryFilter]);

  const stats = useMemo(() => {
    const totalStock = products.reduce((sum, p) => sum + (p.stock_quantity ?? 0), 0);
    const totalValue = products.reduce((sum, p) => sum + p.price * (p.stock_quantity ?? 0), 0);
    return { totalProducts: products.length, totalStock, totalValue };
  }, [products]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Products</h1>
          <p style={{ margin: '0.3rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {products.length} product{products.length !== 1 ? 's' : ''} in database
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchProducts} disabled={loading} style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--layer-1)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => exportToCsv('products.csv', filteredProducts.map(p => ({
              Name: p.name, Category: p.categories?.name || '', Price: p.price, Stock: p.stock_quantity, InStock: p.in_stock,
            })))}
            style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--layer-1)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
          >
            <Download size={14} /> Export CSV
          </button>
          <button onClick={() => handleOpenModal()} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} /> Add Product
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card spatial-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <p className="kpi-title">Total Products</p>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={18} style={{ color: 'var(--primary)' }} />
            </div>
          </div>
          <h3 className="kpi-value">{stats.totalProducts}</h3>
        </div>
        <div className="kpi-card spatial-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <p className="kpi-title">Total Stock</p>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={18} style={{ color: 'var(--accent)' }} />
            </div>
          </div>
          <h3 className="kpi-value">{stats.totalStock}</h3>
        </div>
        <div className="kpi-card spatial-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <p className="kpi-title">Total Stock Value</p>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'rgba(74,222,128,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IndianRupee size={18} style={{ color: 'var(--success)' }} />
            </div>
          </div>
          <h3 className="kpi-value">₹{stats.totalValue.toFixed(2)}</h3>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.1rem' }}
            placeholder="Search products..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="form-input"
          style={{ maxWidth: 220 }}
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
        >
          <option value="all">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>


      <div className="spatial-card" style={{ padding: '1.5rem' }}>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>

                <th>Image</th>
                <th>Name</th>
                <th>Category</th>
                <th>Variants</th>
                <th>Price</th>
                <th style={{ textAlign: 'center' }}>Stock</th>
                <th>In Stock</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Loading products...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  {products.length === 0 ? 'No products yet. Add your first one!' : 'No products match your search.'}
                </td></tr>
              ) : (
                filteredProducts.map(p => (
                  <tr key={p.id} onClick={() => navigate(`/products/${p.id}`)} style={{ cursor: 'pointer' }}>
                    <td>
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} style={{ width: 34, height: 34, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                      ) : (
                        <div style={{ width: 34, height: 34, backgroundColor: 'var(--layer-0)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🛒</div>
                      )}
                    </td>
                    <td style={{ maxWidth: 180 }}>
                      <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    </td>
                    <td>
                      <span style={{ padding: '2px 7px', borderRadius: 'var(--radius-full)', background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {p.categories?.name || 'Uncategorized'}
                      </span>
                    </td>
                    <td style={{ maxWidth: 160 }}>
                      {p.variants && p.variants.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                          {p.variants.map((v, idx) => (
                            <li key={idx} style={{ fontSize: '0.72rem', whiteSpace: 'nowrap' }}>{v.name} — ₹{v.price_adjustment.toFixed(2)} ({v.stock_quantity})</li>
                          ))}
                        </ul>
                      ) : '—'}
                    </td>
                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>₹{p.price.toFixed(2)}</td>
                    {(() => {
                      const available = p.stock_quantity ?? 0;
                      const sold = soldQuantities[p.id!] ?? 0;
                      const total = available + sold;
                      return (
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 600 }}>{available} / {total}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{sold} sold</div>
                        </td>
                      );
                    })()}
                    <td>
                      <span style={{
                        color: p.in_stock ? 'var(--success)' : 'var(--danger)',
                        backgroundColor: p.in_stock ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
                        padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700,
                      }}>
                        {p.in_stock ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ProductFormModal
        isOpen={isModalOpen}
        editingProduct={editingProduct}
        categories={categories}
        onClose={handleCloseModal}
        onSaved={async () => { await fetchProducts(); handleCloseModal(); }}
        onCategoryCreated={category => setCategories(prev => [...prev, category])}
      />
    </div>
  );
}
