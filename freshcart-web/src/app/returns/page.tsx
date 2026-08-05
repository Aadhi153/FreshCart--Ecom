import { AccountPageShell } from '../../components/AccountPageShell';
import { ReturnsList } from '../../components/ReturnsList';

export default function ReturnsPage() {
  return (
    <AccountPageShell
      title="Returns & Refunds"
      description="Track return and replacement requests for delivered orders."
    >
      <ReturnsList />
    </AccountPageShell>
  );
}
