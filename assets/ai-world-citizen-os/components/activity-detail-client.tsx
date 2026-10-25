"use client";

import { useEffect, useMemo, useState } from "react";
import { ActivityAICompanion } from "@/components/activity-ai-companion";
import { ActivityDetailCard } from "@/components/interaction-detail-cards";
import { ActivityStatusButton } from "@/components/user-input-components";
import { getTravelImageForLocation } from "@/lib/travel-images";
import { getEffectiveActivity, type EffectiveItineraryItem } from "@/lib/supabase/effective-itinerary";
import type { RouteCityView } from "@/lib/supabase/cities";
import type { CountryView } from "@/lib/supabase/countries";
import type { CultureEntryView } from "@/lib/supabase/culture";
import type { DailyPlanView } from "@/lib/supabase/itinerary";
import type { TripView } from "@/lib/supabase/trips";
import travelConfig from "@/travel.config.json";

function countryForCity(city: string) {
  return travelConfig.cities.find((item) => item.name === city)?.country ?? "";
}

function formatTime(time: string | null) {
  return time ? time.slice(0, 5) : "未定";
}

function legacyActivityId(activity: EffectiveItineraryItem, dailyPlan: DailyPlanView[]) {
  if (!activity.baseId) return undefined;
  const index = dailyPlan[0]?.blocks.findIndex((item) => item.id === activity.baseId) ?? -1;
  return index >= 0 ? `activity-${index}` : undefined;
}

function legacyRouteActivity(id: string, trip: TripView, dailyPlan: DailyPlanView[]): EffectiveItineraryItem | null {
  if (!/^\d+$/.test(id)) return null;
  const index = Number(id);
  const day = dailyPlan[0];
  const block = day?.blocks[index];
  if (!block?.id) return null;

  return {
    id: block.id,
    baseId: block.id,
    userItineraryId: null,
    tripId: trip.id,
    date: day.date,
    time: block.time || null,
    city: day.city,
    title: block.title,
    location: null,
    category: block.category as EffectiveItineraryItem["category"],
    note: null,
    aiNote: block.ai,
    source: "planned",
    isUserEditable: false,
    createdAt: "legacy-route",
  };
}

export function ActivityDetailClient({
  activityId,
  initialActivity,
  trip,
  cities,
  countries,
  cultureEntries,
  dailyPlan,
}: {
  activityId: string;
  initialActivity?: EffectiveItineraryItem | null;
  trip: TripView;
  cities: RouteCityView[];
  countries: CountryView[];
  cultureEntries: CultureEntryView[];
  dailyPlan: DailyPlanView[];
}) {
  const resolvedInitialActivity = useMemo(
    () => (initialActivity?.id === activityId ? initialActivity : null),
    [activityId, initialActivity],
  );
  const legacyActivity = useMemo(() => legacyRouteActivity(activityId, trip, dailyPlan), [activityId, dailyPlan, trip]);
  const immediatelyResolvedActivity = resolvedInitialActivity ?? legacyActivity;
  const [activity, setActivity] = useState<EffectiveItineraryItem | null>(immediatelyResolvedActivity);
  const [loading, setLoading] = useState(!immediatelyResolvedActivity);

  useEffect(() => {
    if (immediatelyResolvedActivity) {
      setActivity(immediatelyResolvedActivity);
      setLoading(false);
      return;
    }

    let active = true;
    setActivity(null);
    setLoading(true);
    void getEffectiveActivity(activityId, trip.id).then((result) => {
      if (active) {
        setActivity(result.data);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [activityId, immediatelyResolvedActivity, trip.id]);

  if (loading) {
    return <section className="rounded-[var(--radius-medium)] bg-white/90 p-5 text-sm leading-[1.6] text-text-secondary shadow-[var(--shadow-soft-card)]">正在读取这段旅程...</section>;
  }

  if (!activity) {
    return <section className="rounded-[var(--radius-medium)] bg-white/90 p-5 text-sm leading-[1.6] text-text-secondary shadow-[var(--shadow-soft-card)]">这段行程不存在，或你没有查看它的权限。</section>;
  }

  const country = countryForCity(activity.city);
  const place = activity.title;
  const aiHref = `/ai/companion?city=${encodeURIComponent(activity.city)}&country=${encodeURIComponent(country)}&place=${encodeURIComponent(place)}`;
  const memoryParams = new URLSearchParams({
    city: activity.city,
    country,
    date: activity.date,
    sentence: `今天完成了${place}，我想把这一刻留下来。`,
    activityTitle: place,
    category: activity.category ?? "Experience",
    completed: "true",
    whyImportant: activity.aiNote ?? "这个地点在今天的旅程中值得被记住。",
    observe: activity.aiNote ?? "这里有值得现场观察的细节。",
    cultureTips: "以尊重的方式进入现场，保留观察和记录的时间。",
  });

  return (
    <div className="space-y-4">
      <ActivityDetailCard
        image={getTravelImageForLocation(activity.location ?? activity.city, place)}
        time={formatTime(activity.time)}
        title={place}
        city={activity.city}
        category={activity.category ?? "Experience"}
        location={activity.location}
        note={activity.note}
        why={activity.aiNote ?? "这个地点将在真实行程中提供更完整的背景说明。"}
        aiHref={aiHref}
      />
      <ActivityAICompanion
        trip={trip}
        cities={cities}
        countries={countries}
        cultureEntries={cultureEntries}
        dailyPlan={dailyPlan}
        city={activity.city}
        country={country}
        place={place}
      />
      <ActivityStatusButton activityId={activity.id} legacyActivityId={legacyActivityId(activity, dailyPlan)} />
      <a
        href={`/journal/memory/new?${memoryParams.toString()}`}
        className="flex min-h-12 w-full items-center justify-center rounded-[var(--radius-small)] bg-accent-orange px-4 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(232,138,74,0.28)]"
      >
        生成旅行记忆
      </a>
    </div>
  );
}
