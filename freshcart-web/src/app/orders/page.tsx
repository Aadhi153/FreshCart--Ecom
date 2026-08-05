'use client';

import { useState } from 'react';
import { AccountPageShell } from '../../components/AccountPageShell';
import { OrdersDetails } from '../../components/OrdersDetails';
import { ReturnsList } from '../../components/ReturnsList';
import { AccountTabs } from '../../components/AccountTabs';
import styles from '../../components/OrdersDetails.module.css';

const TABS = ['orders', 'returns'] as const;

export default function OrdersPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('orders');

  return (
    <AccountPageShell
      title="Orders"
      description="Orders appear here after you place them."
    >
      <div className={styles.filterRow}>
        <button
          type="button"
          onClick={() => setTab('orders')}
          className={`${styles.filterChip} ${tab === 'orders' ? styles.filterChipActive : ''}`}
        >
          Orders
        </button>
        <button
          type="button"
          onClick={() => setTab('returns')}
          className={`${styles.filterChip} ${tab === 'returns' ? styles.filterChipActive : ''}`}
        >
          Returns
        </button>
      </div>

      <AccountTabs activeKey={tab}>
        {tab === 'orders' ? <OrdersDetails /> : <ReturnsList />}
      </AccountTabs>
    </AccountPageShell>
  );
}
