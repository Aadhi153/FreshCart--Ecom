import { AccountPageShell } from '../../components/AccountPageShell';
import { PaymentMethodsDetails } from '../../components/PaymentMethodsDetails';

export default function PaymentMethodsPage() {
  return (
    <AccountPageShell
      title="Payment Methods"
      description="Saved cards, UPI, and wallets for faster checkout."
    >
      <PaymentMethodsDetails />
    </AccountPageShell>
  );
}
