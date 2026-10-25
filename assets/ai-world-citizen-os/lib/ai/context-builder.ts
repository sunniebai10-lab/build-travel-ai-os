import type { BuildTravelContextInput, TravelAIContext } from "@/lib/ai/types";
import { detectJourneyStage } from "@/lib/ai/journey-stage";
import { getDefaultUserContext } from "@/lib/ai/user-profile";
import { calendarDateAtLocalNoon } from "@/lib/travel-date-context";
import travelConfig from "@/travel.config.json";

function normalizeCountryName(country?: string) {
  const map: Record<string, string> = Object.fromEntries(travelConfig.cities.map((city) => [city.code, city.country]));

  return country ? (map[country] ?? country) : "";
}

function resolveCurrentDate(value: BuildTravelContextInput["currentDate"]): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? calendarDateAtLocalNoon(value) : new Date(value);
}

export function buildEnhancedTravelContext(input: BuildTravelContextInput): TravelAIContext {
  const currentCityName = input.city ?? input.trip.today.city;
  const currentCity = input.cities.find((city) => city.name === currentCityName || city.country === input.country) ?? input.cities[0];
  const countryName = normalizeCountryName(input.country ?? currentCity?.country ?? input.countries[0]?.name);
  const currentCountry = input.countries.find((country) => normalizeCountryName(country.name) === countryName || normalizeCountryName(country.code) === countryName);
  const firstDay =
    input.dailyPlan.find((day) => day.city === currentCityName) ??
    input.dailyPlan.find((day) => input.place && day.blocks.some((block) => block.title.toLowerCase().includes(input.place!.toLowerCase()))) ??
    input.dailyPlan[0];
  const itineraryBlock =
    firstDay?.blocks.find((block) => input.place && block.title.toLowerCase().includes(input.place.toLowerCase())) ??
    firstDay?.blocks.find((block) => block.ai) ??
    firstDay?.blocks[0];
  const cultureEntries = input.cultureEntries.filter((entry) => normalizeCountryName(entry.country) === countryName || entry.country === currentCountry?.code);
  const defaultUser = getDefaultUserContext();
  const user = {
    ...defaultUser,
    ...input.userContext,
    interests: input.userContext?.interests ?? defaultUser.interests,
  };
  const detectedJourney = detectJourneyStage({
    currentDate: resolveCurrentDate(input.currentDate),
    startDate: input.trip.startDate,
    endDate: input.trip.endDate,
    currentDay: input.trip.currentDay,
    totalDays: input.trip.totalDays,
    itinerary: input.dailyPlan,
  });
  const journey = input.journeyStage ? { ...detectedJourney, journeyStage: input.journeyStage } : detectedJourney;

  return {
    trip: {
      name: input.trip.name,
      dateRange: input.trip.dateRange,
      currentDay: input.trip.currentDay,
      totalDays: input.trip.totalDays,
      budget: input.trip.budget,
      currency: input.trip.currency,
    },
    location: {
      city: currentCityName,
      country: countryName,
      coordinates: currentCity
        ? {
            lat: currentCity.lat,
            lng: currentCity.lng,
          }
        : undefined,
      place: input.place ?? itineraryBlock?.title,
    },
    culture: {
      history: currentCountry?.history ?? [],
      culture: currentCountry?.culture ?? [],
      taboo: currentCountry?.taboo ?? [],
      entries: cultureEntries,
    },
    itinerary: {
      date: firstDay?.date,
      place: itineraryBlock?.title,
      category: itineraryBlock?.category,
      aiNote: itineraryBlock?.ai,
    },
    user,
    journey,
    intent: input.intent,
  };
}

export function buildTravelContext(input: BuildTravelContextInput): TravelAIContext {
  return buildEnhancedTravelContext(input);
}
