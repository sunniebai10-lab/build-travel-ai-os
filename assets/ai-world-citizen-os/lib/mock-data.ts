import config from "@/travel.config.json";

type ConfiguredActivity = { date: string; time: string; city: string; title: string; location: string; category: string };
const itinerary = config.itinerary as ConfiguredActivity[];

const start = new Date(`${config.startDate}T12:00:00Z`);
const end = new Date(`${config.endDate}T12:00:00Z`);
const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
const firstCity = config.cities[0];

export const trip = {
  id: config.tripId,
  name: config.name,
  dateRange: `${config.startDate} - ${config.endDate}`,
  currentDay: 1,
  totalDays,
  flags: config.cities.map((city) => city.code).filter(Boolean),
  budget: config.budget,
  spent: 0,
  remaining: config.budget,
  today: { city: firstCity?.name ?? "未设置目的地", weather: "", budget: "", culture: "" },
};

export const timeline = itinerary
  .filter((item) => item.date === config.startDate)
  .map((item) => ({ time: item.time, title: item.title, detail: item.location || item.city }));

export const routeCities = config.cities.map((city) => ({
  name: city.name,
  country: city.country,
  lat: city.lat,
  lng: city.lng,
  days: "",
  description: "",
}));

export const dailyPlan = [{
  date: config.startDate,
  city: firstCity?.name ?? "未设置目的地",
  blocks: itinerary.filter((item) => item.date === config.startDate).map((item) => ({
    period: item.category || "Experience", time: item.time, title: item.title, ai: "",
  })),
}];

export const countries = [{
  name: firstCity?.country ?? "未设置国家",
  flag: firstCity?.code ?? "",
  history: [] as string[],
  culture: [] as string[],
  taboo: [] as string[],
}];

export const expenses: Array<{ date: string; title: string; amount: string; rmb: string; category: string; location: string }> = [];
export const journals: Array<{ date: string; city: string; sentence: string; story: string }> = [];
