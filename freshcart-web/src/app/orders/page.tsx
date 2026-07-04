import { AccountPageShell } from '../../components/AccountPageShell';
import { OrdersDetails } from '../../components/OrdersDetails';

export default function OrdersPage() {
  return (
    <AccountPageShell
      title="Orders"
      description="Orders appear here after you place them."
    >
      <OrdersDetails />
    </AccountPageShell>
  );
}
