import { AccountPageShell } from '../../components/AccountPageShell';
import { WishlistDetails } from '../../components/WishlistDetails';

export default function WishlistPage() {
  return (
    <AccountPageShell
      title="Wishlist"
      description="Products appear here after you click the heart."
    >
      <WishlistDetails />
    </AccountPageShell>
  );
}
