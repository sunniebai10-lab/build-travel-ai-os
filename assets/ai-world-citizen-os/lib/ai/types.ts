import type { RouteCityView } from "@/lib/supabase/cities";
import type { CountryView } from "@/lib/supabase/countries";
import type { CultureEntryView } from "@/lib/supabase/culture";
import type { DailyPlanView } from "@/lib/supabase/itinerary";
import type { TripView } from "@/lib/supabase/trips";
import type { AIIntent } from "@/lib/ai/intents";

export type AITask =
  | "culture"
  | "history"
  | "trip_advice"
  | "local_tips"
  | "image_analysis"
  | "image_memory"
  | "memory_generation"
  | "place_recognition";

export type AIProviderName = "deepseek" | "glm" | "mock";

export interface AIProvider {
  name: AIProviderName;
  generateText(request: AITextRequest): Promise<AITextResponse>;
  analyzeImage(request: AIImageRequest): Promise<AITextResponse>;
}

export interface AITextRequest {
  task: AITask;
  intent?: AIIntent;
  question?: string;
  context: TravelAIContext;
}

export interface AIImageRequest extends AITextRequest {
  imageUrl?: string;
}

export interface AITextResponse {
  intent?: AIIntent;
  title?: string;
  summary?: string;
  sections?: AIResponseSection[];
  tips?: string[];
  whyImportant: string;
  history: string;
  observe: string;
  cultureTips: string;
  observationGuide: string;
  localAdvice: string;
  provider: AIProviderName;
  task: AITask;
  source: "mock" | "provider";
}

export interface AIResponseSection {
  title: string;
  content: string;
}

export interface AIMemoryContext {
  trip: {
    name: string;
    country?: string;
    city: string;
  };
  activity?: {
    title: string;
    category: string;
    completed: boolean;
  };
  journal: {
    id?: string;
    sentence: string;
    date: string;
    photos: string[];
  };
  aiInsight?: {
    whyImportant?: string;
    history?: string;
    observe?: string;
    cultureTips?: string;
  };
  userContext: {
    travelStyle: string;
    interests: string[];
  };
}

export interface AIMemoryResponse {
  title: string;
  date: string;
  place: string;
  memory: string;
  insight: string;
  emotion: string;
  reflection: string;
  provider: AIProviderName;
  source: "mock" | "provider";
}

export interface TripMemoryInsight {
  city: string;
  place?: string;
  intent?: AIIntent;
  summary: string;
  whyImportant?: string;
  observe?: string;
  cultureTips?: string;
}

export interface TripMemoryContext {
  trip: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    cities: string[];
  };
  journals: Array<{
    date: string;
    city: string;
    sentence: string;
    story?: string;
    photos: string[];
  }>;
  completedActivities: Array<{
    title: string;
    city: string;
    date: string;
    category?: string;
    completedAt?: string;
  }>;
  itinerary: Array<{
    date: string;
    city: string;
    title: string;
    category?: string;
    aiNote?: string;
  }>;
  aiInsights: TripMemoryInsight[];
  userContext: {
    travelStyle: string;
    interests: string[];
    contentPreference: string;
  };
}

export interface TripMemoryResponse {
  mode: "travel_recap" | "planning_draft";
  title: string;
  tripOverview: string;
  importantPlaces: string[];
  personalHighlights: string[];
  culturalInsights: string[];
  favoriteMoments: string[];
  travelStyle: string;
  provider: AIProviderName;
  source: "mock" | "provider";
}

export interface AIPlannerInput {
  destination: string;
  dates: string;
  duration: string;
  budget: string;
  interests: string[];
  travelStyle: string;
}

export interface AIPlannerDay {
  day: string;
  city: string;
  focus: string;
  reason: string;
}

export interface AIPlannerDraft {
  title: string;
  theme: string;
  route: string;
  reasoning: string;
  dailyOutline: AIPlannerDay[];
  provider: AIProviderName;
  source: "mock" | "provider";
}

export interface TravelAIContext {
  trip: {
    name: string;
    dateRange: string;
    currentDay: number;
    totalDays: number;
    budget: number;
    currency: string;
  };
  location: {
    city: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
    place?: string;
  };
  culture: {
    history: string[];
    culture: string[];
    taboo: string[];
    language?: string;
    entries: CultureEntryView[];
  };
  itinerary: {
    date?: string;
    place?: string;
    category?: string;
    aiNote?: string;
  };
  user: UserTravelContext;
  journey: JourneyStageContext;
  intent?: AIIntent;
}

export interface BuildTravelContextInput {
  trip: TripView;
  cities: RouteCityView[];
  countries: CountryView[];
  cultureEntries: CultureEntryView[];
  dailyPlan: DailyPlanView[];
  intent?: AIIntent;
  userContext?: Partial<UserTravelContext>;
  journeyStage?: JourneyStage;
  currentDate?: Date | string;
  city?: string;
  country?: string;
  place?: string;
}

export interface UserTravelContext {
  name: string;
  travelStyle: string;
  interests: string[];
  language: string;
  contentPreference: string;
}

export type JourneyStage = "before_arrival" | "arriving" | "exploring" | "leaving" | "completed";

export interface JourneyStageContext {
  journeyStage: JourneyStage;
  currentDate: string;
  currentItineraryDate?: string;
  tripProgress: {
    currentDay: number;
    totalDays: number;
    percent: number;
  };
}

export interface RouteAIRequestInput {
  task: AITask;
}

export type AICompanionStatus = "loading" | "thinking" | "success" | "error";

export interface AICompanionResult {
  status: AICompanionStatus;
  response?: AITextResponse;
  error?: string;
}
