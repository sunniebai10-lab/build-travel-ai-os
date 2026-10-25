import { CityDetailContent, DetailPageShell } from "@/components/interaction-detail-cards";
import { getTravelImageForLocation } from "@/lib/travel-images";
import { getRouteCities } from "@/lib/supabase/cities";
import { getCountries } from "@/lib/supabase/countries";
import { getCultureEntries } from "@/lib/supabase/culture";
import travelConfig from "@/travel.config.json";

export default async function CityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const index = Number.parseInt(id, 10);
  const [citiesResult, countriesResult, cultureResult] = await Promise.all([
    getRouteCities(),
    getCountries(),
    getCultureEntries(),
  ]);
  const cities = citiesResult.data;
  const city = cities[Number.isFinite(index) ? index : 0] ?? cities[0];
  const countryCode = travelConfig.cities.find((item) => item.country === city?.country)?.code;
  const country = countriesResult.data.find((item) => item.name === city?.country || item.code === countryCode);
  const culture = cultureResult.data.find((item) => item.country === city?.country || item.country === country?.code);
  const history = country?.history?.join(" → ") || culture?.content || "这座城市的故事将在真实文化知识库中继续展开。";
  const journeyRole = `${city?.name ?? "这座城市"} 是 ${travelConfig.name} 的一站。`;
  const aiHref = `/ai/companion?city=${encodeURIComponent(city?.name ?? "City")}&country=${encodeURIComponent(city?.country ?? "World")}&place=${encodeURIComponent(city?.name ?? "City")}`;

  return (
    <DetailPageShell title="City Detail" eyebrow="City" backHref="/#mobile-route">
      <CityDetailContent
        image={getTravelImageForLocation(city?.name, city?.name)}
        city={city?.name ?? "City"}
        country={city?.country ?? "World"}
        days={city?.days ?? ""}
        description={city?.description ?? "城市故事将在真实数据接入后展开。"}
        history={history}
        journeyRole={journeyRole}
        aiHref={aiHref}
      />
    </DetailPageShell>
  );
}
