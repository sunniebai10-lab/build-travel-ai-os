"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Mic, Search, Send, Sparkles, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SaveAIInsightButton } from "@/components/save-ai-insight-button";
import { CultureInsightCard, PhotoSurface } from "@/components/travel-components";
import { getLocalCompanionInsight, suggestedIntentQuestions, type AICompanionResult, type AIIntent } from "@/lib/ai";
import { getTravelImageForLocation } from "@/lib/travel-images";
import type { RouteCityView } from "@/lib/supabase/cities";
import type { CountryView } from "@/lib/supabase/countries";
import type { CultureEntryView } from "@/lib/supabase/culture";
import type { DailyPlanView } from "@/lib/supabase/itinerary";
import { getEffectiveItinerary, type EffectiveItineraryItem } from "@/lib/supabase/effective-itinerary";
import type { TripView } from "@/lib/supabase/trips";
import { getTravelDateContext, matchesTravelDate } from "@/lib/travel-date-context";
import travelConfig from "@/travel.config.json";

type SpeechRecognitionEventLike = Event & {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }>;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function speechRecognitionConstructor() {
  const browser = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}

function voiceErrorMessage(error?: string) {
  if (error === "not-allowed" || error === "service-not-allowed") {
    return "没有麦克风权限，请在浏览器设置中允许麦克风访问。";
  }
  if (error === "aborted") return null;
  return "没有听清，再试一次吧。";
}

type GuideLocation = {
  id: string;
  name: string;
  city: string;
  country: string;
  type: "city" | "place";
  aliases: string[];
};

const guideLocationRegistry: GuideLocation[] = travelConfig.cities.map((city, index) => ({
  id: `configured-city-${index}`,
  name: city.name,
  city: city.name,
  country: city.country,
  type: "city",
  aliases: [city.name],
}));

const cityAliases: Record<string, string[]> = Object.fromEntries(
  travelConfig.cities.map((city) => [city.name, [city.name]]),
);

function guideLocationFromActivity(activity: Pick<EffectiveItineraryItem, "id" | "city" | "title" | "location">, cities: RouteCityView[], fallbackCountry: string): GuideLocation {
  const name = activity.location?.trim() || activity.title;
  const country = cities.find((routeCity) => routeCity.name === activity.city)?.country ?? fallbackCountry;
  return {
    id: `activity-${activity.id}`,
    name,
    city: activity.city,
    country,
    type: name === activity.city ? "city" : "place",
    aliases: [name, activity.title, activity.city, ...(cityAliases[activity.city] ?? [])],
  };
}

function nextGuideActivity(items: EffectiveItineraryItem[]) {
  const currentTime = `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;
  return items.find((item) => item.time !== null && item.time.slice(0, 5) >= currentTime) ?? items.find((item) => item.time) ?? items[0];
}

function uniqueGuideLocations(locations: GuideLocation[]) {
  const seen = new Set<string>();
  return locations.filter((location) => {
    const key = `${location.type}:${location.name}:${location.city}`.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function guideLocationMatches(location: GuideLocation, query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  return !normalized || [location.name, location.city, location.country, ...location.aliases].some((value) => value.toLocaleLowerCase().includes(normalized));
}

export function ActivityAICompanion({
  trip,
  cities,
  countries,
  cultureEntries,
  dailyPlan,
  city,
  country,
  place,
  hasExplicitLocation = false,
}: {
  trip: TripView;
  cities: RouteCityView[];
  countries: CountryView[];
  cultureEntries: CultureEntryView[];
  dailyPlan: DailyPlanView[];
  city: string;
  country: string;
  place: string;
  hasExplicitLocation?: boolean;
}) {
  const initialGuideLocation = useMemo<GuideLocation>(
    () => ({
      id: "initial-guide-location",
      name: place,
      city,
      country,
      type: place === city ? "city" : "place",
      aliases: [place, city, ...(cityAliases[city] ?? [])],
    }),
    [city, country, place],
  );
  const [selectedIntent, setSelectedIntent] = useState<AIIntent>("understand");
  const [result, setResult] = useState<AICompanionResult | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [questionInput, setQuestionInput] = useState("");
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState<string | null>(null);
  const [voiceLanguage, setVoiceLanguage] = useState<"zh-CN" | "en-US">("zh-CN");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const inputSnapshotRef = useRef("");
  const latestTranscriptRef = useRef("");
  const recognitionErrorRef = useRef<string | null>(null);
  const stoppedManuallyRef = useRef(false);
  const requestInFlightRef = useRef(false);
  const requestLocationVersionRef = useRef(0);
  const guideLocationWasSelectedRef = useRef(false);
  const [guideLocation, setGuideLocation] = useState<GuideLocation>(initialGuideLocation);
  const [defaultGuideLocation, setDefaultGuideLocation] = useState<GuideLocation>(initialGuideLocation);
  const [effectiveActivities, setEffectiveActivities] = useState<EffectiveItineraryItem[]>([]);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");

  useEffect(() => {
    if (!navigator.language.toLowerCase().startsWith("zh")) setVoiceLanguage("en-US");
  }, []);

  useEffect(() => {
    const stopForBackground = () => {
      if (document.visibilityState === "hidden") recognitionRef.current?.stop();
    };

    document.addEventListener("visibilitychange", stopForBackground);
    return () => {
      document.removeEventListener("visibilitychange", stopForBackground);
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (hasExplicitLocation) return;

    const travelDate = getTravelDateContext({ tripStartDate: trip.startDate, tripEndDate: trip.endDate }).todayDate;
    const planForToday = dailyPlan.find((day) => matchesTravelDate(day.date, travelDate));
    const planActivity = planForToday?.blocks.find((block) => block.time) ?? planForToday?.blocks[0];
    const fallback = planActivity
      ? guideLocationFromActivity(
          { id: planActivity.id ?? `plan-${planActivity.title}`, city: planForToday?.city ?? city, title: planActivity.title, location: null },
          cities,
          country,
        )
      : initialGuideLocation;

    setDefaultGuideLocation(fallback);
    setGuideLocation((current) => (guideLocationWasSelectedRef.current ? current : fallback));

    let active = true;
    void getEffectiveItinerary(trip.id, travelDate).then((effective) => {
      if (!active) return;
      setEffectiveActivities(effective.data);
      const activity = nextGuideActivity(effective.data);
      if (!activity) return;

      const resolved = guideLocationFromActivity(activity, cities, country);
      setDefaultGuideLocation(resolved);
      setGuideLocation((current) => (guideLocationWasSelectedRef.current ? current : resolved));
    });

    return () => {
      active = false;
    };
  }, [city, cities, country, dailyPlan, hasExplicitLocation, initialGuideLocation, trip.endDate, trip.id, trip.startDate]);

  const guideLocations = useMemo(() => {
    const activityLocations = effectiveActivities.map((activity) => guideLocationFromActivity(activity, cities, country));
    const dailyPlanLocations = dailyPlan.flatMap((day) =>
      day.blocks.map((block) =>
        guideLocationFromActivity({ id: block.id ?? `plan-${day.date}-${block.title}`, city: day.city, title: block.title, location: null }, cities, country),
      ),
    );
    const cityLocations = cities
      .filter((routeCity) => routeCity.country !== "China")
      .map<GuideLocation>((routeCity) => ({
        id: `city-${routeCity.name}`,
        name: routeCity.name,
        city: routeCity.name,
        country: routeCity.country,
        type: "city",
        aliases: [routeCity.name, ...(cityAliases[routeCity.name] ?? [])],
      }));

    return uniqueGuideLocations([guideLocation, defaultGuideLocation, ...activityLocations, ...dailyPlanLocations, ...cityLocations, ...guideLocationRegistry]);
  }, [cities, country, dailyPlan, defaultGuideLocation, effectiveActivities, guideLocation]);

  const matchingGuideLocations = useMemo(() => guideLocations.filter((location) => guideLocationMatches(location, locationQuery)), [guideLocations, locationQuery]);
  const currentJourneyLocations = matchingGuideLocations.filter((location) => location.id.startsWith("activity-"));
  const recommendedGuideLocations = matchingGuideLocations.filter((location) => !location.id.startsWith("activity-"));

  function selectGuideLocation(location: GuideLocation, selectedByUser = true) {
    if (selectedByUser) guideLocationWasSelectedRef.current = true;
    requestLocationVersionRef.current += 1;
    setGuideLocation(location);
    setResult(null);
    setLocationPickerOpen(false);
    setLocationQuery("");
  }

  function openLocationPicker() {
    setLocationPickerOpen(true);
  }

  function updateQuestionInput(value: string) {
    setQuestionInput(value);
    if (value.trim()) setSelectedIntent("freeform");
  }

  async function askCompanion(intent: AIIntent, question?: string) {
    if (requestInFlightRef.current) return;

    requestInFlightRef.current = true;
    const requestLocationVersion = requestLocationVersionRef.current;
    const requestLocation = guideLocation;
    setSelectedIntent(intent);
    setLoadingStep(0);
    setResult({ status: "loading" });
    const firstTimer = window.setTimeout(() => setLoadingStep(1), 420);
    const secondTimer = window.setTimeout(() => setLoadingStep(2), 900);

    try {
      const resolvedQuestion = question?.trim() || suggestedIntentQuestions.find((item) => item.intent === intent)?.label;
      const response = await getLocalCompanionInsight({
        intent,
        question: resolvedQuestion,
        trip,
        cities,
        countries,
        cultureEntries,
        dailyPlan,
        city: requestLocation.city,
        country: requestLocation.country,
        place: requestLocation.name,
      });

      if (requestLocationVersion === requestLocationVersionRef.current) setResult(response);
    } catch {
      if (requestLocationVersion === requestLocationVersionRef.current) setResult({ status: "error" });
    } finally {
      window.clearTimeout(firstTimer);
      window.clearTimeout(secondTimer);
      requestInFlightRef.current = false;
    }
  }

  function toggleVoiceInput() {
    if (voiceListening) {
      stoppedManuallyRef.current = true;
      recognitionRef.current?.stop();
      return;
    }

    const Recognition = speechRecognitionConstructor();
    if (!Recognition) {
      setVoiceMessage("当前浏览器暂不支持语音输入，你仍然可以直接打字。");
      return;
    }

    setVoiceMessage(null);
    const recognition = new Recognition();
    recognition.lang = voiceLanguage;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    inputSnapshotRef.current = questionInput;
    latestTranscriptRef.current = "";
    recognitionErrorRef.current = null;
    stoppedManuallyRef.current = false;
    recognition.onstart = () => {
      setVoiceListening(true);
    };
    recognition.onresult = (event) => {
      const startIndex = Number.isInteger(event.resultIndex) ? event.resultIndex : 0;
      const transcript = Array.from({ length: Math.max(0, event.results.length - startIndex) }, (_, index) => event.results[startIndex + index]?.[0]?.transcript ?? "")
        .join(" ")
        .trim();

      if (transcript) {
        latestTranscriptRef.current = transcript;
        const baseInput = inputSnapshotRef.current.trim();
        updateQuestionInput(baseInput ? `${baseInput} ${transcript}` : transcript);
        const changedResult = Array.from({ length: Math.max(0, event.results.length - startIndex) }, (_, index) => event.results[startIndex + index])
          .some((entry) => entry?.isFinal === true);
        setVoiceMessage(changedResult ? "语音已添加，可编辑后发送。" : "正在识别…");
      }
    };
    recognition.onerror = (event) => {
      recognitionErrorRef.current = event.error ?? "unknown";
      setVoiceMessage(voiceErrorMessage(event.error));
    };
    recognition.onend = () => {
      setVoiceListening(false);
      const transcript = latestTranscriptRef.current.trim();
      if (transcript) {
        const baseInput = inputSnapshotRef.current.trim();
        updateQuestionInput(baseInput ? `${baseInput} ${transcript}` : transcript);
        setVoiceMessage("语音已添加，可编辑后发送。");
      } else if (!recognitionErrorRef.current && !stoppedManuallyRef.current) {
        setVoiceMessage("没有听清，再试一次吧。");
      }
      if (recognitionRef.current === recognition) recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setVoiceListening(true);
    try {
      recognition.start();
    } catch {
      setVoiceListening(false);
      recognitionRef.current = null;
      setVoiceMessage("没有听清，再试一次吧。");
    }
  }

  const loadingMessages = ["正在读取你的旅程背景...", "正在理解这个地方...", "正在生成旅行建议..."];

  return (
    <section className="space-y-3">
      <PhotoSurface image={getTravelImageForLocation(guideLocation.city, guideLocation.name)} className="h-[208px] rounded-[var(--radius-large)] [background-position:center_58%] p-5 text-white shadow-[var(--shadow-hero)]">
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <span className="rounded-[var(--radius-small)] bg-white/18 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-md">
              {guideLocation.city} · {guideLocation.country}
            </span>
            <button
              type="button"
              onClick={openLocationPicker}
              className="relative z-10 flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-[var(--radius-small)] bg-white/18 text-white backdrop-blur-md"
              aria-label="切换 AI 向导地点"
            >
              <Search className="h-5 w-5" strokeWidth={1.8} />
            </button>
          </div>
          <div>
            <h2 className="font-serif text-[38px] font-bold leading-none">{guideLocation.name}</h2>
            <p className="mt-3 max-w-[280px] text-sm leading-[1.6] text-white/90">
              {guideLocation.type === "city" ? "当前城市 · 你的 AI 当地向导" : "当前探索地点 · 你的 AI 当地向导"}
            </p>
          </div>
        </div>
      </PhotoSurface>

      {guideLocation.id !== defaultGuideLocation.id ? (
        <button
          type="button"
          onClick={() => {
            guideLocationWasSelectedRef.current = false;
            selectGuideLocation(defaultGuideLocation, false);
          }}
          className="ml-auto block text-xs font-semibold text-accent-orange"
        >
          回到当前地点
        </button>
      ) : null}

      <div className="rounded-[var(--radius-medium)] bg-white/90 p-4 shadow-[var(--shadow-soft-card)]">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-accent-orange" strokeWidth={1.8} />
        <div>
          <h2 className="text-base font-semibold">✨ AI Companion</h2>
          <p className="mt-1 text-xs leading-[1.5] text-text-secondary">{guideLocation.city} · {guideLocation.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {suggestedIntentQuestions.map((item) => (
          <Button
            key={item.intent}
            type="button"
            variant={selectedIntent === item.intent ? "default" : "secondary"}
            onClick={() => void askCompanion(item.intent)}
            className="h-11 rounded-[var(--radius-small)] px-2 text-xs"
          >
            {item.label}
          </Button>
        ))}
      </div>

      <form
        className="mt-3 space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!questionInput.trim() || result?.status === "loading" || result?.status === "thinking") return;
          void askCompanion("freeform", questionInput);
        }}
      >
        <label className="sr-only" htmlFor="activity-ai-question">问 AI 伙伴</label>
        <div className="flex items-end gap-2">
          <textarea
            id="activity-ai-question"
            value={questionInput}
            onChange={(event) => updateQuestionInput(event.target.value)}
            placeholder="输入你想问的问题..."
            rows={2}
            className="min-h-12 min-w-0 flex-1 resize-none rounded-[var(--radius-small)] border border-border-soft bg-white px-3 py-2 text-sm leading-[1.5] text-text-primary outline-none focus:ring-2 focus:ring-accent-orange/30"
          />
          <button
            type="button"
            onClick={toggleVoiceInput}
            aria-label={voiceListening ? "停止语音输入" : "语音输入"}
            aria-pressed={voiceListening}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-small)] transition ${voiceListening ? "bg-accent-orange text-white" : "bg-surface-muted text-text-primary"}`}
          >
            {voiceListening ? <Square className="h-4 w-4" fill="currentColor" /> : <Mic className="h-5 w-5" strokeWidth={1.8} />}
          </button>
          <button
            type="submit"
            disabled={!questionInput.trim() || result?.status === "loading" || result?.status === "thinking"}
            aria-label="发送问题"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-small)] bg-text-primary text-white transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </div>
        <div className="flex items-center justify-between gap-3 text-xs text-text-secondary" aria-live="polite">
          <span>{voiceListening ? "正在听…" : voiceMessage}</span>
          <button
            type="button"
            onClick={() => setVoiceLanguage((current) => (current === "zh-CN" ? "en-US" : "zh-CN"))}
            disabled={voiceListening}
            className="shrink-0 font-semibold text-accent-orange disabled:opacity-50"
            aria-label="切换语音识别语言"
          >
            {voiceLanguage === "zh-CN" ? "中文" : "EN"}
          </button>
        </div>
      </form>

      {result?.status === "loading" || result?.status === "thinking" ? (
        <p className="mt-3 rounded-[var(--radius-small)] bg-surface-muted px-4 py-3 text-sm leading-[1.6] text-text-secondary">
          {loadingMessages[loadingStep]}
        </p>
      ) : null}

      {result?.status === "error" ? (
        <p className="mt-3 rounded-[var(--radius-small)] bg-surface-muted px-4 py-3 text-sm leading-[1.6] text-text-secondary">
          暂时没有连接上 AI，请再试一次。
        </p>
      ) : null}

      {result?.status === "success" ? (
        <div className="mt-3 space-y-3">
          {result.response?.summary ? (
            <CultureInsightCard
              variant="history"
              title={result.response.title ?? "现场理解"}
              description={result.response.summary}
            />
          ) : null}
          <CultureInsightCard
            variant="history"
            title={result.response?.intent === "freeform" ? "直接回答" : "为什么这里重要？"}
            description={result.response?.whyImportant ?? "这里有一段值得慢慢理解的旅程背景。"}
          />
          <CultureInsightCard variant="history" title={result.response?.intent === "freeform" ? "相关背景" : "历史背景"} description={result.response?.history ?? "历史背景会结合当前城市与地点继续展开。"} />
          <CultureInsightCard variant="local-tip" title={result.response?.intent === "freeform" ? "现场判断" : "你可以观察什么？"} description={result.response?.observe ?? result.response?.observationGuide ?? "先观察空间、动线与人的停留方式。"} />
          <CultureInsightCard variant="culture" title={result.response?.intent === "freeform" ? "注意事项" : "当地文化提醒"} description={result.response?.cultureTips ?? "尊重现场秩序，先观察再行动。"} />
          <CultureInsightCard variant="local-tip" title={result.response?.intent === "freeform" ? "下一步建议" : "旅行建议"} description={result.response?.localAdvice ?? "慢一点，把这个地方放进今天的旅程里理解。"} />
          <SaveAIInsightButton response={result.response} city={guideLocation.city} place={guideLocation.name} />
        </div>
      ) : null}
      </div>

      {locationPickerOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/30 p-0"
          role="dialog"
          aria-modal="true"
          aria-label="切换 AI 向导地点"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setLocationPickerOpen(false);
          }}
        >
          <div className="w-full rounded-t-[24px] bg-[var(--background)] px-4 pb-[calc(20px+env(safe-area-inset-bottom))] pt-4 shadow-[0_-12px_30px_rgba(44,35,23,0.14)]">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border-soft" />
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">切换 AI 向导地点</h2>
              <button type="button" onClick={() => setLocationPickerOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-small)] bg-white text-text-primary" aria-label="关闭地点选择">
                <X className="h-5 w-5" strokeWidth={1.8} />
              </button>
            </div>
            <label className="relative mt-4 block">
              <span className="sr-only">搜索城市或地点</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" strokeWidth={1.8} />
              <input
                value={locationQuery}
                onChange={(event) => setLocationQuery(event.target.value)}
                placeholder="搜索城市或地点"
                className="h-12 w-full rounded-[var(--radius-small)] border border-border-soft bg-white px-11 text-base text-text-primary outline-none focus:ring-2 focus:ring-accent-orange/30"
                autoFocus
              />
            </label>
            <div className="mt-4 max-h-[48dvh] space-y-4 overflow-y-auto pb-2">
              {currentJourneyLocations.length ? (
                <LocationList title="当前行程" locations={currentJourneyLocations} selectedId={guideLocation.id} onSelect={selectGuideLocation} />
              ) : null}
              <LocationList title={currentJourneyLocations.length ? "推荐地点" : "当前行程与推荐地点"} locations={recommendedGuideLocations} selectedId={guideLocation.id} onSelect={selectGuideLocation} />
            </div>
          </div>
        </div>
      ) : null}

    </section>
  );
}

function LocationList({
  title,
  locations,
  selectedId,
  onSelect,
}: {
  title: string;
  locations: GuideLocation[];
  selectedId: string;
  onSelect: (location: GuideLocation) => void;
}) {
  if (!locations.length) return <p className="text-sm text-text-secondary">没有找到匹配地点。</p>;

  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">{title}</h3>
      <div className="space-y-2">
        {locations.map((location) => (
          <button
            key={location.id}
            type="button"
            onClick={() => onSelect(location)}
            className={`flex min-h-12 w-full items-center gap-3 rounded-[var(--radius-small)] px-3 text-left transition ${location.id === selectedId ? "bg-[color:rgba(215,181,109,0.2)]" : "bg-white"}`}
          >
            <MapPin className="h-4 w-4 shrink-0 text-accent-orange" strokeWidth={1.8} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-text-primary">{location.name}</span>
              <span className="block truncate text-xs text-text-secondary">{location.city} · {location.country}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
