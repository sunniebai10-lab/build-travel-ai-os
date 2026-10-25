import { ActivityAICompanion } from "@/components/activity-ai-companion";
import { DetailPageShell } from "@/components/interaction-detail-cards";
import { BottomNavigation } from "@/components/travel-components";
import { getRouteCities } from "@/lib/supabase/cities";
import { getCountries } from "@/lib/supabase/countries";
import { getCultureEntries } from "@/lib/supabase/culture";
import { getItinerary } from "@/lib/supabase/itinerary";
import { getTrip } from "@/lib/supabase/trips";
import travelConfig from "@/travel.config.json";

function resolveCountry(city: string, fallback?: string) {
  if (fallback && fallback !== "World") return fallback;
  return travelConfig.cities.find((item) => item.name === city)?.country ?? "";
}

function pickContextualPlace(city: string, dailyPlan: Awaited<ReturnType<typeof getItinerary>>["data"]["dailyPlan"], requestedPlace?: string) {
  if (requestedPlace) return requestedPlace;

  const cityDay = dailyPlan.find((day) => day.city === city) ?? dailyPlan[0];
  return cityDay?.blocks.find((block) => block.category === "History")?.title ?? cityDay?.blocks[0]?.title ?? city;
}

export default async function AICompanionPage({
  searchParams,
}: {
  searchParams?: Promise<{ city?: string; country?: string; place?: string }>;
}) {
  const [tripResult, citiesResult, countriesResult, cultureResult, itineraryResult] = await Promise.all([
    getTrip(),
    getRouteCities(),
    getCountries(),
    getCultureEntries(),
    getItinerary(),
  ]);
  const params = (await searchParams) ?? {};
  const hasLocationContext = Boolean(params.city || params.place);

  const city = params.city || tripResult.data.today.city || travelConfig.cities[0]?.name || "未设置目的地";
  const country = resolveCountry(city, params.country);
  const place = pickContextualPlace(city, itineraryResult.data.dailyPlan, params.place);

  return (
    <>
      <DetailPageShell title="理解这个地方" eyebrow="AI Local Companion" backHref="/ai">
        <div className="space-y-3">
          <ActivityAICompanion
            trip={tripResult.data}
            cities={citiesResult.data}
            countries={countriesResult.data}
            cultureEntries={cultureResult.data}
            dailyPlan={itineraryResult.data.dailyPlan}
            city={city}
            country={country}
            place={place}
            hasExplicitLocation={hasLocationContext}
          />
        </div>
      </DetailPageShell>
      <div className="md:hidden">
        <BottomNavigation activeTab="/ai" />
      </div>
    </>
  );
}
