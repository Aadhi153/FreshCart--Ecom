'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { CheckCircle2, PackageCheck, ShoppingBag, Truck } from 'lucide-react';
import { getOrderById } from '../../../lib/api';
import type { Order } from '@freshcart/types';
import { Confetti } from '../../../components/Confetti';
import { OrderTimeline } from '../../../components/OrderTimeline';
import styles from './page.module.css';

export default function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    getOrderById(id)
      .then(setOrder)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load order.'));

    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, [id]);

  if (error) {
    return (
      <main className={styles.page}>
        <p className={styles.errorText}>{error}</p>
        <button type="button" className={styles.secondaryButton} onClick={() => router.push('/orders')}>
          Go to Orders
        </button>
      </main>
    );
  }

  const items = order?.order_items || [];

  return (
    <main className={styles.page}>
      <Confetti active={showConfetti} />

      <div className={styles.hero}>
        <div className={styles.checkWrap}>
          <CheckCircle2 size={56} strokeWidth={2.2} className={styles.checkIcon} />
        </div>
        <h1 className={styles.heading}>Order Placed Successfully! 🎉</h1>
        {order && <p className={styles.orderId}>Order #{order.id?.slice(0, 8).toUpperCase()}</p>}
        <p className={styles.estimate}>
          <Truck size={15} /> {order?.delivery_slot ? `Arriving: ${order.delivery_slot}` : 'Estimated delivery: 2-3 days'}
        </p>
      </div>

      {order && (
        <div className={styles.summaryCard}>
          <OrderTimeline status={order.status} />
          <h2 className={styles.summaryTitle}><PackageCheck size={16} /> Order Summary</h2>
          {items.map((item: any, i: number) => (
            <div key={item.id || i} className={styles.itemRow}>
              <div className={styles.itemImage}>
                {item.products?.image_url && (
                  <Image src={item.products.image_url} alt={item.products?.name || 'Item'} fill sizes="46px" style={{ objectFit: 'cover' }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className={styles.itemName}>{item.products?.name || 'Item'}</p>
                <p className={styles.itemMeta}>Qty {item.quantity} &middot; ₹{Number(item.price_at_time).toFixed(2)}</p>
              </div>
            </div>
          ))}
          <div className={styles.totalRow}>
            <span>Total Paid</span>
            <span className={styles.totalValue}>₹{Number(order.total_amount).toFixed(2)}</span>
          </div>
        </div>
      )}

      <div className={styles.actions}>
        <button type="button" className={styles.primaryButton} onClick={() => router.push('/orders')}>
          Track Order
        </button>
        <button type="button" className={styles.secondaryButton} onClick={() => router.push('/shop')}>
          <ShoppingBag size={15} /> Continue Shopping
        </button>
      </div>
    </main>
  );
}
