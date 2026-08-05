import { AccountPageShell } from '../../components/AccountPageShell';
import { ReviewsDetails } from '../../components/ReviewsDetails';

export default function ReviewsPage() {
  return (
    <AccountPageShell
      title="My Reviews"
      description="Ratings and comments you've left on products."
    >
      <ReviewsDetails />
    </AccountPageShell>
  );
}
