import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PromotionFormPage from '../components/promotion-form/PromotionFormPage';
import { getPromotion } from '../lib/api';
import type { Promotion } from '@freshcart/types';

export default function PromotionEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    getPromotion(id)
      .then(setPromotion)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Loading promotion...</div>;
  }

  if (notFound || !promotion) {
    return (
      <div style={{ padding: '2rem' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Promotion not found.</p>
        <button className="btn-secondary" onClick={() => navigate('/promotions')}>Back to Promotions</button>
      </div>
    );
  }

  return <PromotionFormPage editingPromotion={promotion} />;
}
