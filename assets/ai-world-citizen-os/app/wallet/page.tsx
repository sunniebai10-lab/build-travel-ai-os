import { DetailPageShell } from "@/components/interaction-detail-cards";
import { AuthSyncStatus } from "@/components/auth-sync-status";
import { WalletPanel } from "@/components/mobile-travel-os";
import { BottomNavigation } from "@/components/travel-components";
import { getFinance } from "@/lib/supabase/expenses";
import { getTrip } from "@/lib/supabase/trips";

export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const [tripResult, financeResult] = await Promise.all([getTrip(), getFinance()]);
  const trip = {
    ...tripResult.data,
    spent: financeResult.data.spent,
    remaining: financeResult.data.remaining,
    today: {
      ...tripResult.data.today,
      budget: `${financeResult.data.remaining.toLocaleString()} ${tripResult.data.currency} remaining`,
    },
  };

  return (
    <>
      <DetailPageShell title="我的钱包" eyebrow="Wallet" backHref="/#mobile-today">
        <div className="space-y-4">
          <AuthSyncStatus />
          <WalletPanel trip={trip} expenses={financeResult.data.expenses} />
        </div>
      </DetailPageShell>
      <div className="md:hidden">
        <BottomNavigation activeTab="/wallet" />
      </div>
    </>
  );
}
