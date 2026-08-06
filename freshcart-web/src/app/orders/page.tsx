'use client';

import { Suspense } from 'react';
import { AccountPageShell } from '../../components/AccountPageShell';
import { OrdersDetails } from '../../components/OrdersDetails';

export default function OrdersPage() {
  return (
    <AccountPageShell
      title="Orders"
      description="Orders appear here after you place them."
    >
      <Suspense fallback={<p style={{ margin: 0, color: 'var(--text-secondary)' }}>Loading orders...</p>}>
        <OrdersDetails />
      </Suspense>
    </AccountPageShell>
  );
}
