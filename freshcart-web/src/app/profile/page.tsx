import { AccountPageShell } from '../../components/AccountPageShell';
import { ProfileDetails } from '../../components/ProfileDetails';

export default function ProfilePage() {
  return (
    <AccountPageShell
      title="Profile"
      description="Manage your stored account details."
    >
      <ProfileDetails />
    </AccountPageShell>
  );
}
