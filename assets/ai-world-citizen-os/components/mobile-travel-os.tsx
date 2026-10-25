"use client";

import { ArrowLeft, BookOpen, ChevronRight, Compass, MapPin, Plus, Search, Sparkles, X } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityDetailClient } from "@/components/activity-detail-client";
import { AuthSyncStatus } from "@/components/auth-sync-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RouteMap } from "@/components/route-map";
import {
  BottomNavigation,
  BudgetCard,
  CultureInsightCard,
  ExpenseCard,
  MemoryCard,
  MobileCard,
  RouteStopCard,
  TimelineCard,
  TravelHeroCard,
  travelImages,
  type ExpenseVariant,
  type RouteStopStatus,
  type TimelineVariant,
} from "@/components/travel-components";
import type { RouteCityView } from "@/lib/supabase/cities";
import type { CountryView } from "@/lib/supabase/countries";
import type { CultureEntryView } from "@/lib/supabase/culture";
import { getFinance, type ExpenseView, type FinanceView } from "@/lib/supabase/expenses";
import type { DailyPlanView, TimelineItemView } from "@/lib/supabase/itinerary";
import { getJournalEntries, type JournalEntryView } from "@/lib/supabase/journal";
import type { TripView } from "@/lib/supabase/trips";
import { getEffectiveItinerary, type EffectiveItineraryItem } from "@/lib/supabase/effective-itinerary";
import { createSpontaneousItinerary, itineraryCategories, type ItineraryCategory, type UserItineraryWriteResult } from "@/lib/supabase/user-itinerary";
import { calendarDateAtLocalNoon, getRouteTravelStatuses, getTravelDateContext, matchesTravelDate } from "@/lib/travel-date-context";
import { getUserExpenses, type UserExpenseInput } from "@/lib/user-input-store";
import { getTravelImageForLocation } from "@/lib/travel-images";
import travelConfig from "@/travel.config.json";

interface MobileTravelOSProps {
  trip: TripView;
  countries: CountryView[];
  routeCities: RouteCityView[];
  timeline: TimelineItemView[];
  dailyPlan: DailyPlanView[];
  expenses: ExpenseView[];
  cultureEntries: CultureEntryView[];
  usingFallback: boolean;
  runtimeLabel: string;
}

type CityExplorerRecommendation = {
  label: string;
  title: string;
  description: string;
};

type CityExplorerCity = {
  key: string;
  english: string;
  chinese: string;
  country: string;
  aliases: string[];
  recommendations?: CityExplorerRecommendation[];
};

const cityExplorerRegistry: CityExplorerCity[] = travelConfig.cities.map((city, index) => ({
  key: `${index}-${city.name}`,
  english: city.name,
  chinese: city.name,
  country: city.country,
  aliases: [city.name],
}));

function cityExplorerEntry(value: string | null | undefined) {
  const normalized = value?.trim().toLocaleLowerCase();
  if (!normalized) return undefined;
  return cityExplorerRegistry.find((city) => city.aliases.some((alias) => alias.toLocaleLowerCase() === normalized));
}

function cityMatchesSearch(city: CityExplorerCity, query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  return !normalized || [city.english, city.chinese, ...city.aliases].some((value) => value.toLocaleLowerCase().includes(normalized));
}

function MobileSection({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-5 px-4 py-8">
      <div className="mb-4">
        <div className="text-xs font-bold uppercase tracking-[0.22em] text-accent-orange">{eyebrow}</div>
        <h2 className="mt-1 text-pretty text-[var(--type-heading-size)] font-bold leading-[var(--type-heading-line)] tracking-normal text-text-primary">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function TodayHeader({ city, currentDay, totalDays }: { city: string; currentDay: number; totalDays: number }) {
  return (
    <div className="min-h-[72px] px-4 pb-3 pt-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[var(--type-body-size)] leading-[var(--type-body-line)] text-text-secondary">你好，{travelConfig.travelerName}</p>
          <h1 className="mt-1 font-serif text-[var(--type-display-size)] font-bold leading-[var(--type-display-line)] tracking-normal text-text-primary">
            {city}
          </h1>
          <p className="mt-2 text-[var(--type-body-size)] font-medium leading-[var(--type-body-line)] text-text-secondary">
            {city} · Day {currentDay} / {totalDays}
          </p>
        </div>
        <button type="button" aria-label="Profile" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-text-primary text-white shadow-[0_12px_24px_rgba(28,28,28,0.16)]">
          <Compass className="h-5 w-5" strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}

function periodToVariant(period?: string): TimelineVariant {
  const value = period?.toLowerCase() ?? "";
  if (value.includes("transport")) return "transport";
  if (value.includes("evening")) return "evening";
  if (value.includes("afternoon")) return "afternoon";
  return "morning";
}

function categoryToExpenseVariant(category?: string): ExpenseVariant {
  const value = category?.toLowerCase() ?? "";
  if (value.includes("food")) return "food";
  if (value.includes("transport")) return "transport";
  if (value.includes("hotel")) return "hotel";
  if (value.includes("ticket")) return "ticket";
  return "other";
}

function formatLocalExpense(expense: UserExpenseInput): ExpenseView {
  return {
    date: expense.date.slice(5).replace("-", "/"),
    title: expense.note || expense.category,
    amount: `${expense.amount.toLocaleString()} ${expense.currency}`,
    rmb: expense.currency === travelConfig.currency ? `${expense.amount.toLocaleString()} ${travelConfig.currency}` : "",
    category: expense.category,
    location: expense.location,
  };
}

const categoryLabels: Record<ItineraryCategory, string> = {
  History: "历史",
  Culture: "文化",
  Food: "美食",
  Nature: "自然",
  Experience: "体验",
  Transport: "交通",
  Planning: "计划",
};

function formatTimelineTime(time: string | null) {
  return time ? time.slice(0, 5) : "未定";
}

function toInitialEffectiveItinerary(timeline: TimelineItemView[], dailyPlan: DailyPlanView[], trip: TripView, date: string): EffectiveItineraryItem[] {
  const matchingPlan = dailyPlan.find((day) => matchesTravelDate(day.date, date));
  const blocks = matchingPlan?.blocks.length
    ? matchingPlan.blocks
    : timeline.map((item) => ({ id: item.id, period: "Today", time: item.time, title: item.title, ai: item.detail, category: "Experience" }));

  return blocks.map((item, index) => ({
    id: item.id ?? `initial-${index}`,
    baseId: item.id ?? null,
    userItineraryId: null,
    tripId: trip.id,
    date,
    time: item.time || null,
    city: matchingPlan?.city ?? trip.today.city,
    title: item.title,
    location: null,
    category: (item.category as ItineraryCategory | undefined) ?? "Experience",
    note: null,
    aiNote: item.ai,
    source: "planned",
    isUserEditable: false,
    createdAt: `initial-${index}`,
  }));
}

function AddJourneySheet({
  open,
  trip,
  date,
  city,
  onClose,
  onSaved,
}: {
  open: boolean;
  trip: TripView;
  date: string;
  city: string;
  onClose: () => void;
  onSaved: (result: UserItineraryWriteResult) => void;
}) {
  const [time, setTime] = useState("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState<ItineraryCategory>("Experience");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setError("请先填写这一段行程。");
      return;
    }

    setError(null);
    setIsSaving(true);
    const result = await createSpontaneousItinerary({
      tripId: trip.id,
      date,
      time: time || null,
      city,
      title,
      location,
      category,
      note,
    });
    setIsSaving(false);

    if (!result.data) {
      const reason = result.error?.toLowerCase() ?? "";
      if (reason.includes("signed in") || reason.includes("not authenticated")) {
        setError("请先登录后再添加行程。");
      } else if (reason.includes("permission") || reason.includes("42501") || reason.includes("row-level")) {
        setError("暂时没有保存权限，请确认当前登录状态后重试。");
      } else {
        setError("暂时无法添加行程，请稍后再试。");
      }
      return;
    }

    onSaved(result);
    setTime("");
    setTitle("");
    setLocation("");
    setCategory("Experience");
    setNote("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[rgba(28,28,28,0.24)] p-4 pt-12" role="dialog" aria-modal="true" aria-label="添加行程">
      <form onSubmit={handleSubmit} className="max-h-full w-full overflow-y-auto rounded-[var(--radius-large)] bg-background-warm p-5 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-[0_24px_56px_rgba(28,28,28,0.22)]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-orange">Today</div>
            <h3 className="mt-1 text-xl font-semibold text-text-primary">添加行程</h3>
            <p className="mt-1 text-sm leading-[1.6] text-text-secondary">{city} · {date}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭添加行程" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-text-primary">
            <X className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-text-primary">时间</span>
            <input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="h-12 w-full rounded-[var(--radius-small)] border border-border-soft bg-white px-4 text-base text-text-primary outline-none focus:border-accent-orange" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-text-primary">行程</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="逛加拉塔街区" className="h-12 w-full rounded-[var(--radius-small)] border border-border-soft bg-white px-4 text-base text-text-primary outline-none focus:border-accent-orange" autoFocus />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-text-primary">地点</span>
            <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="地点或街区" className="h-12 w-full rounded-[var(--radius-small)] border border-border-soft bg-white px-4 text-base text-text-primary outline-none focus:border-accent-orange" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-text-primary">分类</span>
            <select value={category} onChange={(event) => setCategory(event.target.value as ItineraryCategory)} className="h-12 w-full rounded-[var(--radius-small)] border border-border-soft bg-white px-4 text-base text-text-primary outline-none focus:border-accent-orange">
              {itineraryCategories.map((item) => <option key={item} value={item}>{categoryLabels[item]}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-text-primary">备注</span>
            <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="可选" className="h-12 w-full rounded-[var(--radius-small)] border border-border-soft bg-white px-4 text-base text-text-primary outline-none focus:border-accent-orange" />
          </label>
        </div>

        {error ? <p className="mt-4 rounded-[var(--radius-small)] bg-[color:rgba(232,138,74,0.1)] px-3 py-2 text-sm leading-[1.5] text-text-primary">{error}</p> : null}
        <Button type="submit" disabled={isSaving} className="mt-5 h-12 w-full rounded-[var(--radius-small)]">
          <Plus className="h-4 w-4" />
          {isSaving ? "正在添加..." : "添加到今日旅程"}
        </Button>
      </form>
    </div>
  );
}

function DailyTimeline({
  items,
  isLoading,
  city,
  trip,
  date,
  onRefresh,
  onOpenActivity,
}: {
  items: EffectiveItineraryItem[];
  isLoading: boolean;
  city: string;
  trip: TripView;
  date: string;
  onRefresh: () => Promise<void>;
  onOpenActivity: (activity: EffectiveItineraryItem) => void;
}) {
  const [isComposerOpen, setComposerOpen] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  async function handleSaved(result: UserItineraryWriteResult) {
    setSyncNotice(result.queued ? "已加入今日旅程，网络恢复后会自动同步。" : "已加入今日旅程。");
    await onRefresh();
  }

  return (
    <>
      <MobileCard>
        <CardHeader className="flex-row items-start justify-between gap-3 p-5 pb-2">
          <div>
            <CardTitle className="text-accent-orange">今日旅程</CardTitle>
            <CardDescription>今天去哪里，按时间慢慢展开。</CardDescription>
          </div>
          <button type="button" onClick={() => setComposerOpen(true)} className="flex h-11 shrink-0 items-center gap-1 rounded-[var(--radius-small)] px-2 text-sm font-semibold text-accent-orange transition active:translate-y-px" aria-label="添加行程">
            <Plus className="h-4 w-4" strokeWidth={1.8} />
            添加行程
          </button>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-0">
          {syncNotice ? <p className="mb-2 text-xs leading-[1.5] text-text-secondary">{syncNotice}</p> : null}
          {isLoading && !items.length ? <div className="min-h-[190px] py-4 text-sm leading-[1.6] text-text-secondary">正在读取今日旅程...</div> : null}
          {items.length ? items.map((item, index) => {
            const row = (
              <TimelineCard
                variant={periodToVariant(item.category ?? undefined)}
                time={formatTimelineTime(item.time)}
                period={item.category ? categoryLabels[item.category] : "今日"}
                title={item.title}
                location={item.location ?? item.city}
                image={getTravelImageForLocation(item.location ?? item.city, item.title)}
                isLast={index === items.length - 1}
              />
            );

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenActivity(item)}
                className="block w-full rounded-[var(--radius-small)] text-left transition active:translate-y-px"
              >
                {row}
              </button>
            );
          }) : null}
          {!isLoading && !items.length ? (
            <div className="min-h-[150px] py-6 text-sm leading-[1.7] text-text-secondary">
              <p className="font-semibold text-text-primary">今天还没有行程</p>
              <p className="mt-2">添加一个临时计划，让今天开始吧。</p>
              <button type="button" onClick={() => setComposerOpen(true)} className="mt-4 inline-flex items-center gap-1 font-semibold text-accent-orange">
                <Plus className="h-4 w-4" /> 添加行程
              </button>
            </div>
          ) : null}
        </CardContent>
      </MobileCard>
      <AddJourneySheet open={isComposerOpen} trip={trip} date={date} city={city} onClose={() => setComposerOpen(false)} onSaved={handleSaved} />
    </>
  );
}

type ActivityOverlayState = {
  activityId: string;
  activity: EffectiveItineraryItem | null;
};

function TodayActivityOverlay({
  selection,
  trip,
  cities,
  countries,
  cultureEntries,
  dailyPlan,
  onClose,
}: {
  selection: ActivityOverlayState;
  trip: TripView;
  cities: RouteCityView[];
  countries: CountryView[];
  cultureEntries: CultureEntryView[];
  dailyPlan: DailyPlanView[];
  onClose: () => void;
}) {
  return (
    <section className="fixed inset-0 z-[70] overflow-y-auto bg-background-warm pb-[calc(124px+env(safe-area-inset-bottom))] text-text-primary md:hidden" role="dialog" aria-modal="true" aria-label="活动详情">
      <div className="mx-auto max-w-[430px] px-4 pb-5 pt-[calc(16px+env(safe-area-inset-top))]">
        <header className="mb-4 flex min-h-12 items-center justify-between">
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/86 text-text-primary shadow-[var(--shadow-soft-card)]" aria-label="返回今日旅程">
            <ArrowLeft className="h-5 w-5" strokeWidth={1.8} />
          </button>
          <div className="text-right">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-orange">Activity</div>
            <h2 className="text-base font-semibold leading-tight">Activity Detail</h2>
          </div>
        </header>
        {selection.activity ? (
          <ActivityDetailClient
            activityId={selection.activityId}
            initialActivity={selection.activity}
            trip={trip}
            cities={cities}
            countries={countries}
            cultureEntries={cultureEntries}
            dailyPlan={dailyPlan}
          />
        ) : (
          <section className="rounded-[var(--radius-medium)] bg-white/90 p-5 text-sm leading-[1.6] text-text-secondary shadow-[var(--shadow-soft-card)]">
            此行程尚未保存到离线数据，请联网后重试。
          </section>
        )}
      </div>
    </section>
  );
}

function CityExplorerSheet({
  open,
  cities,
  selectedCity,
  actualCity,
  onClose,
  onSelect,
}: {
  open: boolean;
  cities: CityExplorerCity[];
  selectedCity: CityExplorerCity;
  actualCity: CityExplorerCity;
  onClose: () => void;
  onSelect: (city: CityExplorerCity) => void;
}) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  if (!open) return null;

  const matches = cities.filter((city) => cityMatchesSearch(city, query));
  const currentJourneyCities = matches.filter((city) => city.country === actualCity.country);
  const upcomingJourneyCities = matches.filter((city) => city.country !== actualCity.country);

  const renderCityRow = (city: CityExplorerCity) => {
    const isSelected = city.key === selectedCity.key;
    return (
      <button
        key={city.key}
        type="button"
        onClick={() => onSelect(city)}
        className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-[var(--radius-small)] px-4 text-left transition active:translate-y-px ${
          isSelected ? "bg-[color:rgba(232,138,74,0.14)] text-text-primary" : "bg-white/76 text-text-primary"
        }`}
      >
        <span className="flex min-w-0 items-center gap-3">
          <MapPin className="h-4 w-4 shrink-0 text-accent-orange" strokeWidth={1.8} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{city.chinese}</span>
            <span className="block truncate text-xs text-text-secondary">{city.english}</span>
          </span>
        </span>
        <span className={`shrink-0 text-xs font-semibold ${isSelected ? "text-accent-orange" : "text-text-secondary"}`}>{isSelected ? "正在探索" : city.country}</span>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[rgba(28,28,28,0.24)] p-4 pt-12" role="dialog" aria-modal="true" aria-label="探索城市">
      <div className="max-h-full w-full overflow-y-auto rounded-[var(--radius-large)] bg-background-warm p-5 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-[0_24px_56px_rgba(28,28,28,0.22)]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-orange">City Explorer</div>
            <h3 className="mt-1 text-xl font-semibold text-text-primary">探索城市</h3>
            <p className="mt-1 text-sm leading-[1.6] text-text-secondary">只切换城市灵感，不会改变今日旅程。</p>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭城市探索" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-text-primary">
            <X className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </div>

        <label className="relative block">
          <span className="sr-only">搜索城市</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" strokeWidth={1.8} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索城市"
            className="h-12 w-full rounded-[var(--radius-small)] border border-border-soft bg-white px-11 text-base text-text-primary outline-none focus:ring-2 focus:ring-accent-orange/30"
          />
        </label>

        {matches.length ? (
          <div className="mt-5 space-y-5">
            {currentJourneyCities.length ? (
              <section>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">当前旅程</h4>
                <div className="space-y-2">{currentJourneyCities.map(renderCityRow)}</div>
              </section>
            ) : null}
            {upcomingJourneyCities.length ? (
              <section>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">接下来的旅程</h4>
                <div className="space-y-2">{upcomingJourneyCities.map(renderCityRow)}</div>
              </section>
            ) : null}
          </div>
        ) : (
          <div className="mt-5 rounded-[var(--radius-medium)] bg-white/76 px-4 py-5 text-sm leading-[1.6] text-text-secondary">暂时还没有这个城市的探索内容</div>
        )}
      </div>
    </div>
  );
}

function CityPlanningCard({ city, actualCity, onOpenExplorer, onReset }: { city: CityExplorerCity; actualCity: CityExplorerCity; onOpenExplorer: () => void; onReset: () => void }) {
  const planningItems = city.recommendations ?? [];
  const isExploringElsewhere = city.key !== actualCity.key;
  return (
    <MobileCard className="p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[var(--type-card-title-size)] font-semibold text-text-primary">探索城市</h2>
        {isExploringElsewhere ? <button type="button" onClick={onReset} className="shrink-0 text-xs font-semibold text-accent-orange">回到当前城市</button> : null}
      </div>
      <div className="mt-3 space-y-3">
        <button type="button" onClick={onOpenExplorer} className="flex h-12 w-full items-center justify-between gap-3 rounded-[var(--radius-small)] border border-border-soft bg-[color:rgba(255,250,242,0.96)] px-3.5 text-left transition active:translate-y-px" aria-label="选择探索城市">
          <span className="flex min-w-0 items-center gap-3">
            <MapPin className="h-4 w-4 shrink-0 text-accent-orange" strokeWidth={1.8} />
            <span className="truncate text-base font-semibold text-text-primary">{city.chinese} <span className="font-normal text-text-secondary">{city.english}</span></span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-text-secondary" strokeWidth={1.8} />
        </button>

        {planningItems.length ? <div className="grid grid-cols-3 gap-2">
          {planningItems.map((item) => (
            <div key={item.label} className="min-w-0 rounded-[var(--radius-small)] bg-[color:rgba(255,250,242,0.96)] px-3 py-2.5">
              <div className="text-xs font-semibold text-accent-orange">{item.label}</div>
              <h3 className="mt-1 text-sm font-semibold leading-5 text-text-primary">{item.title}</h3>
            </div>
          ))}
        </div> : <div className="rounded-[var(--radius-small)] bg-surface-muted px-3 py-4 text-sm leading-[1.6] text-text-secondary">这个城市的探索内容还在准备中。</div>}
      </div>
    </MobileCard>
  );
}

function JourneyClosingBar() {
  return (
    <section className="px-4 pb-[calc(60px+32px+env(safe-area-inset-bottom))] pt-0">
      <a href="/journal" className="block overflow-hidden rounded-[var(--radius-large)] shadow-[var(--shadow-hero)] transition active:translate-y-px">
        <div
          className="relative min-h-[150px] bg-cover bg-center p-5 text-white"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(28,28,28,0.78) 0%, rgba(28,28,28,0.48) 48%, rgba(28,28,28,0.16) 100%), url(${travelImages.journal})`,
          }}
        >
          <div className="flex min-h-[110px] max-w-[240px] flex-col justify-end">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/72">Memory</div>
            <h2 className="mt-2 font-serif text-[26px] font-bold leading-[1.12] tracking-normal">
              你的世界
              <br />
              又大了一点
            </h2>
            <p className="mt-3 text-sm leading-[1.6] text-white/86">把今天看到的地方，慢慢写进自己的世界地图。</p>
          </div>
        </div>
      </a>
    </section>
  );
}

export function WalletPanel({ trip, expenses }: { trip: TripView; expenses: ExpenseView[] }) {
  const [localExpenses, setLocalExpenses] = useState<UserExpenseInput[]>([]);
  const [cloudFinance, setCloudFinance] = useState<FinanceView | null>(null);

  useEffect(() => {
    setLocalExpenses(getUserExpenses());
    void getFinance().then((result) => {
      if (result.source === "supabase") {
        setCloudFinance(result.data);
      }
    });
  }, []);

  const localBaseSpent = localExpenses.reduce((total, expense) => total + (expense.currency === travelConfig.currency ? expense.amount : 0), 0);
  const remoteExpenses = cloudFinance?.expenses ?? expenses;
  const remoteSpent = cloudFinance?.spent ?? trip.spent;
  const mergedExpenses = [...localExpenses.map(formatLocalExpense), ...remoteExpenses];
  const spent = remoteSpent + localBaseSpent;
  const remaining = Math.max(0, trip.budget - spent);

  return (
    <div className="space-y-4">
      <BudgetCard budget={trip.budget} spent={spent} remaining={remaining} />
      <Button asChild className="sticky top-3 z-10 h-12 w-full rounded-[var(--radius-small)]">
        <a href="/expense/new">
          <Plus className="h-4 w-4" />
          记一笔
        </a>
      </Button>
      <MobileCard>
        <CardHeader className="p-5 pb-2">
          <CardTitle>最近消费</CardTitle>
          <CardDescription>最近记录</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 px-5 pb-5 pt-0">
          {mergedExpenses.length ? (
            mergedExpenses.slice(0, 8).map((expense, index) => (
              <ExpenseCard
                key={`${expense.date}-${expense.title}-${index}`}
                variant={categoryToExpenseVariant(expense.category)}
                category={expense.category}
                title={expense.title}
                amount={expense.rmb || expense.amount}
                currency={expense.date}
                location={expense.location}
              />
            ))
          ) : (
            <p className="text-sm text-text-secondary">暂无真实消费记录。</p>
          )}
        </CardContent>
      </MobileCard>
    </div>
  );
}

export function JournalPanel() {
  const [journals, setJournals] = useState<JournalEntryView[]>([]);

  useEffect(() => {
    void getJournalEntries().then((result) => setJournals(result.data));
  }, []);

  return (
    <div className="space-y-4">
      <Button asChild className="h-12 w-full rounded-[var(--radius-small)]">
        <a href="/journal/new">
          <Plus className="h-4 w-4" />
          记录今天
        </a>
      </Button>
      <Button asChild variant="secondary" className="h-12 w-full rounded-[var(--radius-small)]">
        <a href="/journal/trip-memory">
          <Sparkles className="h-4 w-4" />
          整理我的这次旅程
        </a>
      </Button>
      {journals.length ? (
        <div className="space-y-4">
          {journals.map((journal, index) => (
            <div key={journal.id} className="space-y-3">
              <MemoryCard
                variant={journal.story ? "ai-memory" : "photo-text"}
                image={journal.photos[0] || getTravelImageForLocation(journal.city, journal.sentence)}
                date={journal.date}
                location={journal.city}
                sentence={journal.sentence}
                story={journal.story || undefined}
                isFeatured={index === 0}
              />
              {!journal.story ? (
                <Button asChild variant="secondary" className="h-11 w-full rounded-[var(--radius-small)]">
                  <a
                    href={`/journal/memory/new?journalId=${encodeURIComponent(journal.id)}&city=${encodeURIComponent(journal.city)}&date=${encodeURIComponent(journal.date)}&sentence=${encodeURIComponent(journal.sentence)}&photos=${encodeURIComponent(journal.photos.join("|"))}`}
                  >
                    <Sparkles className="h-4 w-4" />
                    AI整理这段记忆
                  </a>
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <MobileCard>
          <CardHeader className="p-5 pb-2">
            <CardTitle>记忆档案</CardTitle>
            <CardDescription>你的旅行手帐将在旅程开始后生成。</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            <div className="rounded-[var(--radius-large)] bg-surface-muted p-6 text-sm leading-[1.6] text-text-secondary">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[var(--radius-medium)] bg-white/80">
                <Plus className="h-6 w-6 text-accent-orange" strokeWidth={1.8} />
              </div>
              你的旅行手帐将在旅程开始后生成。第一张照片和第一句话会成为这里的起点。
            </div>
          </CardContent>
        </MobileCard>
      )}
    </div>
  );
}

export function MobileTravelOS({ trip, countries, routeCities, timeline, dailyPlan, expenses, cultureEntries, usingFallback, runtimeLabel }: MobileTravelOSProps) {
  const [calendarNow, setCalendarNow] = useState<Date | null>(null);
  const previewNow = useMemo(() => calendarDateAtLocalNoon(trip.startDate), [trip.startDate]);
  const travelDateContext = useMemo(
    () => getTravelDateContext({ tripStartDate: trip.startDate, tripEndDate: trip.endDate }, calendarNow ?? previewNow),
    [calendarNow, previewNow, trip.endDate, trip.startDate],
  );
  const todayDate = travelDateContext.todayDate;
  const initialEffectiveItinerary = useMemo(() => toInitialEffectiveItinerary(timeline, dailyPlan, trip, todayDate), [timeline, dailyPlan, trip, todayDate]);
  const matchingPlan = dailyPlan.find((day) => matchesTravelDate(day.date, todayDate));
  const currentRouteCountry = routeCities.find((city) => city.name === matchingPlan?.city)?.country;
  const currentCountry = countries.find((country) => country.name === currentRouteCountry || country.code === currentRouteCountry || country.flag === currentRouteCountry) ?? countries[0];
  const todayNote = matchingPlan?.blocks.find((block) => block.ai)?.ai;
  const countryCulture = cultureEntries.filter((entry) => entry.country === currentCountry?.name || entry.country === currentCountry?.flag);
  const firstInsight = todayNote ?? countryCulture[0]?.content ?? "这里连接了不同的文化与日常生活，也值得慢慢理解。";
  const cultureInsight = countryCulture.find((entry) => entry.category.toLowerCase().includes("culture"))?.content ?? "以尊重的方式进入当地生活，观察日常，不急着评判。";
  const tabooInsight = countryCulture.find((entry) => entry.category.toLowerCase().includes("taboo"))?.content ?? "进入宗教空间时保持安静与尊重，避免敏感政治讨论。";
  const [activeTab, setActiveTab] = useState("#mobile-today");
  const [effectiveItinerary, setEffectiveItinerary] = useState<EffectiveItineraryItem[]>(initialEffectiveItinerary);
  const [isItineraryLoading, setItineraryLoading] = useState(true);
  const [activityOverlay, setActivityOverlay] = useState<ActivityOverlayState | null>(null);
  const [isCityExplorerOpen, setCityExplorerOpen] = useState(false);
  const [explorerCityKey, setExplorerCityKey] = useState(() => cityExplorerEntry(dailyPlan[0]?.city ?? trip.today.city)?.key ?? cityExplorerRegistry[0]?.key ?? "");
  const [hasExplorerSelection, setHasExplorerSelection] = useState(false);
  const itineraryRefreshInFlight = useRef(false);
  const demoRuntimeLabel = usingFallback ? "使用本地体验数据" : runtimeLabel;
  const actualTodayCity = effectiveItinerary[0]?.city ?? dailyPlan[0]?.city ?? trip.today.city ?? routeCities[0]?.name ?? "未设置目的地";
  const routeStatuses = useMemo(
    () => getRouteTravelStatuses(routeCities, travelDateContext, actualTodayCity),
    [actualTodayCity, routeCities, travelDateContext],
  );
  const actualExplorerCity = cityExplorerEntry(actualTodayCity) ?? cityExplorerEntry(trip.today.city) ?? cityExplorerRegistry[0]!;
  const explorerCities = useMemo(() => {
    const cities = routeCities.flatMap((routeCity) => {
      const city = cityExplorerEntry(routeCity.name);
      return city ? [city] : [];
    });
    const uniqueCities = cities.filter((city, index) => cities.findIndex((candidate) => candidate.key === city.key) === index);
    return uniqueCities.some((city) => city.key === actualExplorerCity.key) ? uniqueCities : [actualExplorerCity, ...uniqueCities];
  }, [actualExplorerCity, routeCities]);
  const explorerCity = explorerCities.find((city) => city.key === explorerCityKey) ?? actualExplorerCity;

  useEffect(() => {
    if (!hasExplorerSelection) setExplorerCityKey(actualExplorerCity.key);
  }, [actualExplorerCity.key, hasExplorerSelection]);

  useEffect(() => {
    setCalendarNow(new Date());
  }, []);

  useEffect(() => {
    if (!calendarNow) return;

    const refreshCalendarDate = () => setCalendarNow(new Date());
    const millisecondsUntilTomorrow = new Date(
      calendarNow.getFullYear(),
      calendarNow.getMonth(),
      calendarNow.getDate() + 1,
    ).getTime() - calendarNow.getTime() + 1000;
    const midnightTimer = window.setTimeout(refreshCalendarDate, millisecondsUntilTomorrow);
    const refreshOnForeground = () => {
      if (document.visibilityState === "visible") refreshCalendarDate();
    };

    document.addEventListener("visibilitychange", refreshOnForeground);
    return () => {
      window.clearTimeout(midnightTimer);
      document.removeEventListener("visibilitychange", refreshOnForeground);
    };
  }, [calendarNow]);

  const refreshEffectiveItinerary = useCallback(async () => {
    if (itineraryRefreshInFlight.current) return;

    itineraryRefreshInFlight.current = true;
    setItineraryLoading(true);
    try {
      const result = await getEffectiveItinerary(trip.id, todayDate);
      setEffectiveItinerary(result.data);
    } catch {
      // The existing snapshot remains visible while the data layer retries later.
    } finally {
      itineraryRefreshInFlight.current = false;
      setItineraryLoading(false);
    }
  }, [todayDate, trip.id]);

  useEffect(() => {
    setEffectiveItinerary(initialEffectiveItinerary);
  }, [initialEffectiveItinerary]);

  useEffect(() => {
    void refreshEffectiveItinerary();
  }, [refreshEffectiveItinerary]);

  useEffect(() => {
    const refreshOnReconnect = () => {
      void refreshEffectiveItinerary();
    };

    const refreshOnForeground = () => {
      if (document.visibilityState === "visible") {
        void refreshEffectiveItinerary();
      }
    };

    window.addEventListener("online", refreshOnReconnect);
    document.addEventListener("visibilitychange", refreshOnForeground);
    return () => {
      window.removeEventListener("online", refreshOnReconnect);
      document.removeEventListener("visibilitychange", refreshOnForeground);
    };
  }, [refreshEffectiveItinerary]);

  const openActivityOverlay = useCallback((activity: EffectiveItineraryItem) => {
    window.history.pushState({ aiwcActivityOverlay: true, activityId: activity.id }, "", `/activity/${activity.id}`);
    setActivityOverlay({ activityId: activity.id, activity });
  }, []);

  const closeActivityOverlay = useCallback(() => {
    if (window.history.state?.aiwcActivityOverlay) {
      window.history.back();
      return;
    }
    setActivityOverlay(null);
  }, []);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as { aiwcActivityOverlay?: boolean; activityId?: string } | null;
      if (!state?.aiwcActivityOverlay || !state.activityId) {
        setActivityOverlay(null);
        return;
      }

      const activity = effectiveItinerary.find((item) => item.id === state.activityId) ?? null;
      setActivityOverlay({ activityId: state.activityId, activity });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [effectiveItinerary]);

  useEffect(() => {
    setActivityOverlay((current) => {
      if (!current) return current;
      const activity = effectiveItinerary.find((item) => item.id === current.activityId) ?? null;
      return activity === current.activity ? current : { activityId: current.activityId, activity };
    });
  }, [effectiveItinerary]);

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const syncHash = () => {
      const nextHash = window.location.hash || "#mobile-today";
      setActiveTab(`/${nextHash}`);

      window.requestAnimationFrame(() => {
        document.querySelector(nextHash)?.scrollIntoView({ block: "start" });
      });
    };

    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  return (
    <div className="min-h-[100dvh] bg-background-warm text-text-primary md:hidden">
      <TodayHeader city={actualTodayCity} currentDay={travelDateContext.currentDay} totalDays={trip.totalDays} />
      <div className="px-4">
        <div className="rounded-[var(--radius-small)] border border-border-soft bg-white/70 px-4 py-3 text-xs leading-[1.6] text-text-secondary shadow-[0_10px_28px_rgba(83,58,36,0.05)]">
          <span className="font-semibold text-text-primary">{demoRuntimeLabel}</span>
          {usingFallback ? <span className="ml-1">云端服务尚未连接，部分操作仅保存在本机。</span> : null}
        </div>
        <div className="mt-3">
          <AuthSyncStatus compact />
        </div>
      </div>

      <MobileSection id="mobile-today" eyebrow="Today" title="今天，你将走进怎样的世界？">
        <div className="space-y-4">
          <TravelHeroCard
            variant="city"
            image={travelImages.istanbul}
            title={actualTodayCity}
            subtitle={trip.name}
            location={actualTodayCity}
            weather={trip.today.weather}
          />
          <CityPlanningCard
            city={explorerCity}
            actualCity={actualExplorerCity}
            onOpenExplorer={() => setCityExplorerOpen(true)}
            onReset={() => {
              setExplorerCityKey(actualExplorerCity.key);
              setHasExplorerSelection(false);
            }}
          />
          <DailyTimeline
            items={effectiveItinerary}
            isLoading={isItineraryLoading}
            city={actualTodayCity}
            trip={trip}
            date={todayDate}
            onRefresh={refreshEffectiveItinerary}
            onOpenActivity={openActivityOverlay}
          />
          <CultureInsightCard
            variant="culture"
            title="AI Insight · 今日文化提醒"
            description={firstInsight}
            detailTitle="注意事项"
            detail={currentCountry?.taboo?.[0] ? "进入宗教空间时保持安静与尊重，拍摄人物前先征求同意。" : undefined}
          />
        </div>
      </MobileSection>

      <MobileSection id="mobile-guide" eyebrow="AI Guide" title="AI Local Companion">
        <div className="space-y-4">
          <TravelHeroCard
            variant="country"
            image={getTravelImageForLocation(actualTodayCity, effectiveItinerary[0]?.title ?? actualTodayCity)}
            title={effectiveItinerary[0]?.title ?? actualTodayCity}
            subtitle="当前地点 · 你的 AI 当地向导"
            location={actualTodayCity}
            actionHref="/ai/companion"
            actionLabel="打开完整 AI 向导"
          />
          <MobileCard>
            <CardHeader className="p-5 pb-2">
              <CardTitle>继续探索这里</CardTitle>
              <CardDescription>在完整 AI 向导中切换地点、语音提问，或输入你眼前的疑问。</CardDescription>
            </CardHeader>
            <CardContent className="px-5 pb-5 pt-0">
              <a href="/ai/companion" className="flex h-12 w-full items-center justify-center rounded-[var(--radius-small)] bg-text-primary px-4 text-sm font-semibold text-white">
                打开完整 AI 向导
              </a>
            </CardContent>
          </MobileCard>
        </div>
      </MobileSection>

      <MobileSection id="mobile-route" eyebrow="Route" title="我的旅程路线">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[var(--radius-large)] shadow-[0_18px_44px_rgba(83,58,36,0.08)]">
            <RouteMap cities={routeCities} />
          </div>
          <div className="space-y-3">
            {routeCities.map((city, index) => (
              <a key={`${city.name}-${index}`} href={`/city/${index}`} className="block rounded-[var(--radius-medium)] transition active:translate-y-px">
                <RouteStopCard
                  city={city.name}
                  country={city.country}
                  dateRange={city.days}
                  image={index % 2 === 0 ? travelImages.istanbul : travelImages.cappadocia}
                  description={city.description ?? city.days}
                  status={routeStatuses[index] ?? "upcoming"}
                  index={index}
                  isLast={index === routeCities.length - 1}
                />
              </a>
            ))}
          </div>
        </div>
      </MobileSection>

      <JourneyClosingBar />

      <BottomNavigation activeTab={activeTab} />
      {activityOverlay ? (
        <TodayActivityOverlay
          selection={activityOverlay}
          trip={trip}
          cities={routeCities}
          countries={countries}
          cultureEntries={cultureEntries}
          dailyPlan={dailyPlan}
          onClose={closeActivityOverlay}
        />
      ) : null}
      <CityExplorerSheet
        open={isCityExplorerOpen}
        cities={explorerCities}
        selectedCity={explorerCity}
        actualCity={actualExplorerCity}
        onClose={() => setCityExplorerOpen(false)}
        onSelect={(city) => {
          setExplorerCityKey(city.key);
          setHasExplorerSelection(true);
          setCityExplorerOpen(false);
        }}
      />
    </div>
  );
}
