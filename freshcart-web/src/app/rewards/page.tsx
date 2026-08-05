import { AccountPageShell } from '../../components/AccountPageShell';
import { RewardsDetails } from '../../components/RewardsDetails';

export default function RewardsPage() {
  return (
    <AccountPageShell
      title="Coupons & Rewards"
      description="Your referral code, referral history, and available offers."
    >
      <RewardsDetails />
    </AccountPageShell>
  );
}
