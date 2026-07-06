import { useState, useEffect, useMemo } from 'react';
import { getReviews, deleteReview } from '../lib/api';
import type { AdminReview } from '../lib/api';
import { Trash2, RefreshCw, Search, Star } from 'lucide-react';
import { useToast } from '../components/ToastProvider';

export default function Reviews() {
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');

  useEffect(() => {
    fetchReviews();
  }, []);

  async function fetchReviews() {
    try {
      setLoading(true);
      const data = await getReviews();
      setReviews(data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      showToast('Failed to load reviews.', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this review permanently?')) return;
    try {
      await deleteReview(id);
      setReviews(prev => prev.filter(r => r.id !== id));
      showToast('Review deleted', 'success');
    } catch (error) {
      console.error('Error deleting review:', error);
      showToast('Failed to delete review.', 'error');
    }
  };

  const filteredReviews = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return reviews.filter(r => {
      const matchesSearch = !q
        || (r.comment || '').toLowerCase().includes(q)
        || (r.products?.name || '').toLowerCase().includes(q)
        || (r.profiles?.full_name || '').toLowerCase().includes(q);
      const matchesRating = ratingFilter === 'all' || r.rating === Number(ratingFilter);
      return matchesSearch && matchesRating;
    });
  }, [reviews, searchQuery, ratingFilter]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Reviews</h1>
          <p style={{ margin: '0.3rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {reviews.length} review{reviews.length !== 1 ? 's' : ''} across all products
          </p>
        </div>
        <button onClick={fetchReviews} disabled={loading} style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--layer-1)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
          <RefreshCw size={14} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.1rem' }}
            placeholder="Search by product, customer, or comment..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <select className="form-input" style={{ maxWidth: 160 }} value={ratingFilter} onChange={e => setRatingFilter(e.target.value)}>
          <option value="all">All Ratings</option>
          {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} star{r !== 1 ? 's' : ''}</option>)}
        </select>
      </div>

      <div className="spatial-card" style={{ padding: '1.5rem' }}>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Customer</th>
                <th>Rating</th>
                <th>Comment</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Loading reviews...</td></tr>
              ) : filteredReviews.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  {reviews.length === 0 ? 'No reviews yet.' : 'No reviews match your search.'}
                </td></tr>
              ) : (
                filteredReviews.map(r => (
                  <tr key={r.id}>
                    <td style={{ maxWidth: 180 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {r.products?.image_url ? (
                          <img src={r.products.image_url} alt={r.products.name} style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 'var(--radius-sm)', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 28, height: 28, backgroundColor: 'var(--layer-0)', borderRadius: 'var(--radius-sm)', flexShrink: 0 }} />
                        )}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.products?.name || 'Deleted product'}</span>
                      </div>
                    </td>
                    <td>{r.profiles?.full_name || 'Anonymous'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--warning, #f5a623)' }}>
                        {r.rating} <Star size={13} fill="currentColor" />
                      </span>
                    </td>
                    <td style={{ maxWidth: 280 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: r.comment ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {r.comment || '(no comment)'}
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button onClick={() => handleDelete(r.id!)} style={{ padding: '0.4rem', background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
