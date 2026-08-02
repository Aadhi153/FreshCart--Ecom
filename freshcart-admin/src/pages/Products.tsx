import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Product } from '@freshcart/types';
import { Plus, RefreshCw, Search, Package, Layers, IndianRupee, Download } from 'lucide-react';
import { Button, Card, EmptyState, Skeleton, Table, Thead, Tbody, Tr, Th, Td } from '@freshcart/ui';
import { exportToCsv } from '../lib/csv';
import { useProducts, useCategories, useProductSoldQuantities } from '../lib/queries/products';

export default function Products() {
  const navigate = useNavigate();
  const { data: products = [], isLoading: loading, refetch } = useProducts();
  const { data: categories = [] } = useCategories();
  const { data: soldQuantities = {} } = useProductSoldQuantities();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p: Product) => {
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
      const matchesCategory = categoryFilter === 'all' || p.category_id === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, categoryFilter]);

  const stats = useMemo(() => {
    const totalStock = products.reduce((sum: number, p: Product) => sum + (p.stock_quantity ?? 0), 0);
    const totalValue = products.reduce((sum: number, p: Product) => sum + p.price * (p.stock_quantity ?? 0), 0);
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
          <Button variant="secondary" onClick={() => refetch()} disabled={loading} leftIcon={<RefreshCw size={14} />} />
          <Button
            variant="secondary"
            leftIcon={<Download size={14} />}
            onClick={() => exportToCsv('products.csv', filteredProducts.map(p => ({
              Name: p.name, Category: p.categories?.name || '', Price: p.price, Stock: p.stock_quantity, InStock: p.in_stock,
            })))}
          >
            Export CSV
          </Button>
          <Button variant="primary" leftIcon={<Plus size={18} />} onClick={() => navigate('/products/new')}>
            Add Product
          </Button>
        </div>
      </div>

      <div className="kpi-grid">
        <Card className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <p className="kpi-title">Total Products</p>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--accent-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={18} style={{ color: 'var(--accent)' }} />
            </div>
          </div>
          <h3 className="kpi-value">{stats.totalProducts}</h3>
        </Card>
        <Card className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <p className="kpi-title">Total Stock</p>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--info-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={18} style={{ color: 'var(--info)' }} />
            </div>
          </div>
          <h3 className="kpi-value">{stats.totalStock}</h3>
        </Card>
        <Card className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <p className="kpi-title">Total Stock Value</p>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--success-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IndianRupee size={18} style={{ color: 'var(--success)' }} />
            </div>
          </div>
          <h3 className="kpi-value">₹{stats.totalValue.toFixed(2)}</h3>
        </Card>
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

      <Card style={{ padding: '1.5rem' }}>
        <Table>
          <Thead>
            <Tr>
              <Th>Image</Th>
              <Th>Name</Th>
              <Th>Category</Th>
              <Th>Variants</Th>
              <Th>Price</Th>
              <Th style={{ textAlign: 'center' }}>Stock</Th>
              <Th>In Stock</Th>
            </Tr>
          </Thead>
          <Tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Tr key={i}>
                  <Td colSpan={7}><Skeleton height={34} /></Td>
                </Tr>
              ))
            ) : filteredProducts.length === 0 ? (
              <Tr>
                <Td colSpan={7}>
                  <EmptyState
                    icon={<Package size={28} />}
                    title={products.length === 0 ? 'No products yet' : 'No products match your search'}
                    description={products.length === 0 ? 'Add your first product to get started.' : undefined}
                  />
                </Td>
              </Tr>
            ) : (
              filteredProducts.map(p => (
                <Tr key={p.id} onClick={() => navigate(`/products/${p.id}`)} style={{ cursor: 'pointer' }}>
                  <Td>
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} style={{ width: 34, height: 34, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                    ) : (
                      <div style={{ width: 34, height: 34, backgroundColor: 'var(--layer-0)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🛒</div>
                    )}
                  </Td>
                  <Td style={{ maxWidth: 180 }}>
                    <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  </Td>
                  <Td>
                    <span style={{ padding: '2px 7px', borderRadius: 'var(--radius-full)', background: 'var(--accent-tint)', color: 'var(--accent)', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {p.categories?.name || 'Uncategorized'}
                    </span>
                  </Td>
                  <Td style={{ maxWidth: 160 }}>
                    {p.variants && p.variants.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                        {p.variants.map((v, idx) => (
                          <li key={idx} style={{ fontSize: '0.72rem', whiteSpace: 'nowrap' }}>{v.name} — ₹{v.price_adjustment.toFixed(2)} ({v.stock_quantity})</li>
                        ))}
                      </ul>
                    ) : '—'}
                  </Td>
                  <Td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>₹{p.price.toFixed(2)}</Td>
                  {(() => {
                    const available = p.stock_quantity ?? 0;
                    const sold = soldQuantities[p.id!] ?? 0;
                    const total = available + sold;
                    return (
                      <Td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600 }}>{available} / {total}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{sold} sold</div>
                      </Td>
                    );
                  })()}
                  <Td>
                    <span style={{
                      color: p.in_stock ? 'var(--success)' : 'var(--danger)',
                      backgroundColor: p.in_stock ? 'var(--success-tint)' : 'var(--danger-tint)',
                      padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700,
                    }}>
                      {p.in_stock ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </Card>
    </div>
  );
}
