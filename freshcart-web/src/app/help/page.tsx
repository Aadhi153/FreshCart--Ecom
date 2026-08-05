import { AccountPageShell } from '../../components/AccountPageShell';
import { HelpSupportDetails } from '../../components/HelpSupportDetails';

export default function HelpPage() {
  return (
    <AccountPageShell
      title="Help & Support"
      description="Answers to common questions, and how to reach us."
    >
      <HelpSupportDetails />
    </AccountPageShell>
  );
}
