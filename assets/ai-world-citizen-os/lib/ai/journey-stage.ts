import type { DailyPlanView } from "@/lib/supabase/itinerary";
import type { JourneyStage, JourneyStageContext } from "@/lib/ai/types";

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

export function detectJourneyStage({
  currentDate = new Date(),
  startDate,
  endDate,
  currentDay,
  totalDays,
  itinerary,
}: {
  currentDate?: Date;
  startDate: string;
  endDate: string;
  currentDay: number;
  totalDays: number;
  itinerary?: DailyPlanView[];
}): JourneyStageContext {
  const today = startOfDay(currentDate);
  const start = startOfDay(parseDate(startDate));
  const end = startOfDay(parseDate(endDate));
  let journeyStage: JourneyStage = "exploring";

  if (today < start) {
    journeyStage = "before_arrival";
  } else if (today > end) {
    journeyStage = "completed";
  } else if (currentDay <= 1) {
    journeyStage = "arriving";
  } else if (currentDay >= Math.max(1, totalDays - 1)) {
    journeyStage = "leaving";
  }

  return {
    journeyStage,
    currentDate: currentDate.toISOString().slice(0, 10),
    tripProgress: {
      currentDay,
      totalDays,
      percent: Math.min(100, Math.max(0, Math.round((currentDay / Math.max(1, totalDays)) * 100))),
    },
    currentItineraryDate: itinerary?.[0]?.date,
  };
}
