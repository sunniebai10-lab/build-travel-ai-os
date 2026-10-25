import { ActivityDetailClient } from "@/components/activity-detail-client";
import { DetailPageShell } from "@/components/interaction-detail-cards";
import { getRouteCities } from "@/lib/supabase/cities";
import { getCountries } from "@/lib/supabase/countries";
import { getCultureEntries } from "@/lib/supabase/culture";
import { getItinerary } from "@/lib/supabase/itinerary";
import { getTrip } from "@/lib/supabase/trips";

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [tripResult, citiesResult, countriesResult, cultureResult, itineraryResult] = await Promise.all([
    getTrip(),
    getRouteCities(),
    getCountries(),
    getCultureEntries(),
    getItinerary(),
  ]);
  return (
    <DetailPageShell title="Activity Detail" eyebrow="Activity" backHref="/#mobile-today">
      <ActivityDetailClient
        activityId={id}
        trip={tripResult.data}
        cities={citiesResult.data}
        countries={countriesResult.data}
        cultureEntries={cultureResult.data}
        dailyPlan={itineraryResult.data.dailyPlan}
      />
    </DetailPageShell>
  );
}
