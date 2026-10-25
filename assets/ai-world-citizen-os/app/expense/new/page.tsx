import { DetailPageShell } from "@/components/interaction-detail-cards";
import { TodayExpenseInputCard } from "@/components/user-input-components";
import { getItinerary } from "@/lib/supabase/itinerary";
import { getTrip } from "@/lib/supabase/trips";

export default async function NewExpensePage() {
  const [tripResult, itineraryResult] = await Promise.all([getTrip(), getItinerary()]);

  return (
    <DetailPageShell title="记一笔" eyebrow="Wallet" backHref="/wallet">
      <TodayExpenseInputCard trip={tripResult.data} dailyPlan={itineraryResult.data.dailyPlan} />
    </DetailPageShell>
  );
}
