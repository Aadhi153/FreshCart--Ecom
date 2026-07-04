
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ProductFormModal from '../components/ProductFormModal';
import { getProduct, getCategories, getProductSoldQuantities, deleteProduct } from '../lib/api';
import type { Product, Category } from '@freshcart/types';
import { ArrowLeft, Edit2, Trash2, Package, Layers, IndianRupee, ShoppingBag } from 'lucide-react';
import { useToast } from '../components/ToastProvider';

function StatTile({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="spatial-card" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [soldQuantity, setSoldQuantity] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchProduct = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setNotFound(false);
      const [data, sold] = await Promise.all([getProduct(id), getProductSoldQuantities()]);
      setProduct(data);
      setSoldQuantity(sold[id] ?? 0);
    } catch (error) {
      console.error('Error fetching product:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
    getCategories().then(setCategories).catch(err => console.error('Error fetching categories:', err));
  }, [fetchProduct]);

  const handleDelete = async () => {
    if (!product?.id) return;
    if (!window.confirm('Delete this product permanently?')) return;
    try {
      await deleteProduct(product.id);
      showToast('Product deleted', 'success');
      navigate('/products');
    } catch (error) {
      console.error('Error deleting product:', error);
      showToast('Failed to delete product.', 'error');
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading product...</div>;
  }

  if (notFound || !product) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Product not found.</p>
        <Link to="/products" className="btn-secondary" style={{ display: 'inline-flex', marginTop: '1rem' }}>Back to Products</Link>
      </div>
    );
  }

  const available = product.stock_quantity ?? 0;
  const totalStock = available + soldQuantity;

  return (
    <div>
      <Link to="/products" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1.25rem', textDecoration: 'none' }}>
        <ArrowLeft size={16} /> Back to Products
      </Link>

      <div className="spatial-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} style={{ width: 110, height: 110, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 110, height: 110, borderRadius: 'var(--radius-md)', background: 'var(--layer-0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', flexShrink: 0 }}>🛒</div>
            )}
            <div>
              <h1 style={{ margin: 0 }}>{product.name}</h1>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{ padding: '3px 9px', borderRadius: 'var(--radius-full)', background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 600 }}>
                  {product.categories?.name || 'Uncategorized'}
                </span>
                <span style={{
                  color: product.in_stock ? 'var(--success)' : 'var(--danger)',
                  backgroundColor: product.in_stock ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
                  padding: '3px 9px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700,
                }}>
                  {product.in_stock ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>
              {product.created_at && (
                <p style={{ margin: '0.6rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Added {new Date(product.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              )}
              <p style={{ margin: '0.6rem 0 0', fontSize: '0.9rem', lineHeight: 1.5, maxWidth: 480 }}>
                {product.description || 'No description provided.'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', flexShrink: 0 }}>
            <button onClick={() => setIsModalOpen(true)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Edit2 size={15} /> Edit
            </button>
            <button
              onClick={handleDelete}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', cursor: 'pointer', background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', fontWeight: 600 }}
            >
              <Trash2 size={15} /> Delete
            </button>
          </div>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
        <StatTile icon={<Layers size={14} />} label="Stock Available" value={String(available)} />
        <StatTile icon={<Package size={14} />} label="Total Stock (Ever)" value={String(totalStock)} sub="available + sold" />
        <StatTile icon={<ShoppingBag size={14} />} label="Units Sold" value={String(soldQuantity)} />
      </div>

      <div className="spatial-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem' }}>Variants</h3>
        {product.variants && product.variants.length > 0 ? (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Rate</th>
                  <th style={{ textAlign: 'center' }}>Stock</th>
                </tr>
              </thead>
              <tbody>
                {product.variants.map((v, idx) => (
                  <tr key={v.id ?? idx}>
                    <td>
                      {v.image_url ? (
                        <img src={v.image_url} alt={v.name} style={{ width: 34, height: 34, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                      ) : (
                        <div style={{ width: 34, height: 34, backgroundColor: 'var(--layer-0)', borderRadius: 'var(--radius-sm)' }} />
                      )}
                    </td>
                    <td>{v.name}</td>
                    <td>₹{v.price_adjustment.toFixed(2)}</td>
                    <td style={{ textAlign: 'center' }}>{v.stock_quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No variants for this product.</p>
        )}
      </div>

      <ProductFormModal
        isOpen={isModalOpen}
        editingProduct={product}
        categories={categories}
        onClose={() => setIsModalOpen(false)}
        onSaved={async () => { await fetchProduct(); setIsModalOpen(false); }}
        onCategoryCreated={category => setCategories(prev => [...prev, category])}
      />
    </div>
  );
}
