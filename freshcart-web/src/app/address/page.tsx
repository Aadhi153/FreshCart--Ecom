import { AccountPageShell } from '../../components/AccountPageShell';
import { AddressDetails } from '../../components/AddressDetails';

export default function AddressPage() {
  return (
    <AccountPageShell
      title="Address"
      description="Edit delivery addresses for faster checkout."
    >
      <AddressDetails />
    </AccountPageShell>
  );
}
