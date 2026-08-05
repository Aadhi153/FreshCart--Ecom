import { AccountPageShell } from '../../components/AccountPageShell';
import { SecurityDetails } from '../../components/SecurityDetails';

export default function SecurityPage() {
  return (
    <AccountPageShell
      title="Security"
      description="Manage sign-in methods and account access."
    >
      <SecurityDetails />
    </AccountPageShell>
  );
}
