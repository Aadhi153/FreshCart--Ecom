import { AccountPageShell } from '../../components/AccountPageShell';
import { NotificationsDetails } from '../../components/NotificationsDetails';

export default function NotificationsPage() {
  return (
    <AccountPageShell
      title="Notifications"
      description="Choose how FreshCart reaches you."
    >
      <NotificationsDetails />
    </AccountPageShell>
  );
}
