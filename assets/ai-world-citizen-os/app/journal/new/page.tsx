import { DetailPageShell } from "@/components/interaction-detail-cards";
import { TodayJournalComposer } from "@/components/user-input-components";
import { getItinerary } from "@/lib/supabase/itinerary";
import { getTrip } from "@/lib/supabase/trips";

export default async function NewJournalPage() {
  const [tripResult, itineraryResult] = await Promise.all([getTrip(), getItinerary()]);

  return (
    <DetailPageShell title="记录今天" eyebrow="Journal" backHref="/journal">
      <TodayJournalComposer trip={tripResult.data} dailyPlan={itineraryResult.data.dailyPlan} />
    </DetailPageShell>
  );
}
