import type { AICompanionResult, TripMemoryInsight, TravelAIContext } from "@/lib/ai/types";
import type { AIIntent } from "@/lib/ai/intents";

const cachePrefix = "ai-world-citizen:local-companion:";
const cacheVersion = "v3";
const cacheTtlMs = 1000 * 60 * 60 * 24 * 7;

type CachedCompanionResult = {
  createdAt: number;
  result: AICompanionResult;
};

function normalizeCachePart(value?: string | number | null) {
  return String(value ?? "unknown").trim().toLowerCase().replace(/\s+/g, "-").slice(0, 80);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function hashString(value: string) {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return (hash >>> 0).toString(36);
}

function createContextFingerprint(context: TravelAIContext, intent?: AIIntent) {
  return {
    intent: intent ?? context.intent,
    location: {
      city: context.location.city,
      country: context.location.country,
      place: context.location.place,
    },
    user: {
      travelStyle: context.user.travelStyle,
      interests: context.user.interests,
      language: context.user.language,
      contentPreference: context.user.contentPreference,
    },
    journey: {
      stage: context.journey.journeyStage,
      currentDay: context.journey.tripProgress.currentDay,
      totalDays: context.journey.tripProgress.totalDays,
    },
    itinerary: {
      date: context.itinerary.date,
      place: context.itinerary.place,
      category: context.itinerary.category,
      aiNote: context.itinerary.aiNote,
    },
    culture: {
      history: context.culture.history,
      culture: context.culture.culture,
      taboo: context.culture.taboo,
    },
  };
}

export function createLocalCompanionCacheKey({
  context,
  intent,
  question,
}: {
  context: TravelAIContext;
  intent?: AIIntent;
  question?: string;
}) {
  const language = context.user.language || "Chinese";
  const contextHash = hashString(stableStringify(createContextFingerprint(context, intent)));
  const questionHash = hashString(question?.trim() ?? "");

  return [
    cachePrefix,
    cacheVersion,
    normalizeCachePart(context.location.country),
    normalizeCachePart(context.location.city),
    normalizeCachePart(context.location.place),
    normalizeCachePart(intent ?? context.intent),
    normalizeCachePart(language),
    contextHash,
    questionHash,
  ].join(":");
}

export function readLocalCompanionCache(key: string): AICompanionResult | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    const cached = JSON.parse(raw) as CachedCompanionResult;
    if (!cached.createdAt || Date.now() - cached.createdAt > cacheTtlMs) {
      window.localStorage.removeItem(key);
      return null;
    }

    return cached.result;
  } catch {
    return null;
  }
}

export function writeLocalCompanionCache(key: string, result: AICompanionResult) {
  if (typeof window === "undefined" || result.status !== "success") return;

  try {
    const cached: CachedCompanionResult = {
      createdAt: Date.now(),
      result,
    };
    window.localStorage.setItem(key, JSON.stringify(cached));
  } catch {
    // Cache is best-effort only.
  }
}

/**
 * AI Companion insights are intentionally local-only for this MVP. This turns
 * user-triggered, still-valid cache entries into a small Trip Memory input.
 */
export function readLocalTripMemoryInsights(cities: string[]): TripMemoryInsight[] {
  if (typeof window === "undefined") return [];

  const citySet = new Set(cities.map((city) => city.trim().toLowerCase()));
  const insights: TripMemoryInsight[] = [];

  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(cachePrefix)) continue;

      const cached = readLocalCompanionCache(key);
      const response = cached?.response;
      if (!response) continue;

      const keyParts = key.split(":");
      const city = keyParts[4] ?? "";
      if (citySet.size && !citySet.has(city.toLowerCase())) continue;

      insights.push({
        city,
        place: keyParts[5] ?? "",
        intent: response.intent,
        summary: response.summary ?? response.whyImportant,
        whyImportant: response.whyImportant,
        observe: response.observe,
        cultureTips: response.cultureTips,
      });
    }
  } catch {
    return [];
  }

  return insights.slice(0, 12);
}
