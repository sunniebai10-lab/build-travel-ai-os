export type TravelDateContext = {
  localDate: string;
  todayDate: string;
  tripStartDate: string;
  tripEndDate: string;
  currentDay: number;
  isBeforeTrip: boolean;
  isDuringTrip: boolean;
  isAfterTrip: boolean;
};

export type RouteTravelStatus = "departure" | "current" | "completed" | "upcoming";

type RouteDateEntry = {
  name: string;
  days: string;
};

function localDateString(now: Date) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateParts(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Invalid calendar date: ${value}`);
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export function calendarDateAtLocalNoon(value: string) {
  const { year, month, day } = dateParts(value);
  return new Date(year, month - 1, day, 12);
}

function calendarDayNumber(value: string) {
  const { year, month, day } = dateParts(value);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

function dateFromMonthDay(year: number, month: string, day: string) {
  return `${year}-${month}-${day}`;
}

function routeDateRanges(days: string, year: number) {
  const ranges: Array<{ start: string; end: string }> = [];
  const pattern = /(\d{2})\.(\d{2})\s*-\s*(\d{2})\.(\d{2})/g;
  let match = pattern.exec(days);
  while (match) {
    ranges.push({
      start: dateFromMonthDay(year, match[1], match[2]),
      end: dateFromMonthDay(year, match[3], match[4]),
    });
    match = pattern.exec(days);
  }
  return ranges;
}

export function getTravelDateContext(
  trip: Pick<TravelDateContext, "tripStartDate" | "tripEndDate">,
  now = new Date(),
): TravelDateContext {
  const localDate = localDateString(now);
  const startDay = calendarDayNumber(trip.tripStartDate);
  const endDay = calendarDayNumber(trip.tripEndDate);
  const localDay = calendarDayNumber(localDate);
  const isBeforeTrip = localDay < startDay;
  const isAfterTrip = localDay > endDay;
  const isDuringTrip = !isBeforeTrip && !isAfterTrip;
  const todayDate = isBeforeTrip ? trip.tripStartDate : isAfterTrip ? trip.tripEndDate : localDate;

  return {
    localDate,
    todayDate,
    tripStartDate: trip.tripStartDate,
    tripEndDate: trip.tripEndDate,
    currentDay: calendarDayNumber(todayDate) - startDay + 1,
    isBeforeTrip,
    isDuringTrip,
    isAfterTrip,
  };
}

export function getRouteTravelStatuses<T extends RouteDateEntry>(
  cities: T[],
  context: TravelDateContext,
  currentCity?: string,
): RouteTravelStatus[] {
  const year = dateParts(context.tripStartDate).year;
  const todayDay = calendarDayNumber(context.todayDate);
  const rangesByCity = cities.map((city) => routeDateRanges(city.days, year));

  if (context.isBeforeTrip) {
    return cities.map((_city, index) => (index === 0 ? "departure" : "upcoming"));
  }

  if (context.isAfterTrip) {
    return cities.map(() => "completed");
  }

  const activeCandidates = cities
    .map((city, index) => ({ city, index, ranges: rangesByCity[index] }))
    .filter(({ ranges }) => ranges.some((range) => calendarDayNumber(range.start) <= todayDay && todayDay <= calendarDayNumber(range.end)));
  const active = activeCandidates.find(({ city }) => city.name === currentCity) ?? activeCandidates.at(-1);

  return cities.map((city, index) => {
    if (index === active?.index) return "current";

    const ranges = rangesByCity[index];
    if (ranges.some((range) => calendarDayNumber(range.end) < todayDay)) return "completed";
    if (ranges.some((range) => calendarDayNumber(range.start) > todayDay)) return "upcoming";
    return index === 0 ? "departure" : "upcoming";
  });
}

export function matchesTravelDate(displayDate: string, date: string) {
  if (displayDate === date) return true;

  const { year, month, day } = dateParts(date);
  const expected = new Intl.DateTimeFormat("en", { month: "long", day: "numeric" }).format(calendarDateAtLocalNoon(date));
  return displayDate === expected;
}
