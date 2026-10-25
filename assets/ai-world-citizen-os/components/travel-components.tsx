"use client";

import {
  BookOpen,
  Camera,
  ChevronRight,
  CloudSun,
  Home,
  Landmark,
  Map,
  MapPin,
  MessageCircle,
  NotebookPen,
  Plus,
  Search,
  Sparkles,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import type React from "react";
import { cn } from "@/lib/utils";
import { travelImages } from "@/lib/travel-images";
import travelConfig from "@/travel.config.json";

export { travelImages };

export type TravelHeroVariant = "city" | "memory" | "country";
export type TimelineVariant = "morning" | "afternoon" | "evening" | "transport";
export type CultureInsightVariant = "history" | "culture" | "taboo" | "local-tip";
export type RouteStopStatus = "departure" | "current" | "completed" | "upcoming";
export type MemoryVariant = "photo" | "photo-text" | "ai-memory";
export type ExpenseVariant = "food" | "transport" | "hotel" | "ticket" | "other";

export const bottomNavItems = [
  { href: "/#mobile-today", label: "今日", icon: Home },
  { href: "/#mobile-route", label: "路线", icon: Map },
  { href: "/ai", label: "问AI", icon: Sparkles },
  { href: "/journal", label: "手帐", icon: NotebookPen },
  { href: "/wallet", label: "账本", icon: WalletCards },
];

const categoryIcons: Record<string, string> = {
  Food: "🍜",
  Transport: "🚕",
  Transportation: "🚕",
  Hotel: "🏨",
  Ticket: "🎟",
  Culture: "🏛",
  Experience: "✨",
  Nature: "🌄",
};

const expenseVariantIcons: Record<ExpenseVariant, string> = {
  food: "🍜",
  transport: "🚕",
  hotel: "🏨",
  ticket: "🎟",
  other: "🧾",
};

const routeStatusStyles: Record<RouteStopStatus, string> = {
  departure: "bg-white text-ocean-blue",
  current: "bg-ocean-blue text-white",
  completed: "bg-accent-orange text-white",
  upcoming: "bg-white text-text-secondary",
};

const insightIcons: Record<CultureInsightVariant, LucideIcon> = {
  history: Landmark,
  culture: Sparkles,
  taboo: Landmark,
  "local-tip": BookOpen,
};

const insightTitles: Record<CultureInsightVariant, string> = {
  history: "历史背景",
  culture: "文化礼仪",
  taboo: "注意事项",
  "local-tip": "当地建议",
};

export function PhotoSurface({
  image,
  className,
  children,
}: {
  image: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn("relative overflow-hidden bg-cover bg-center", className)}
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(28,28,28,0.03) 0%, rgba(28,28,28,0.24) 46%, rgba(28,28,28,0.76) 100%), url(${image})`,
      }}
    >
      {children}
    </div>
  );
}

export function TravelHeroCard({
  variant = "city",
  image,
  imageUrl,
  title,
  subtitle,
  location,
  weather,
  date,
  className,
  actionHref,
  actionLabel,
}: {
  variant?: TravelHeroVariant;
  image?: string;
  imageUrl?: string;
  title: string;
  subtitle?: string;
  location?: string;
  weather?: string;
  date?: string;
  className?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  const isMemory = variant === "memory";

  return (
    <div className={cn("overflow-hidden rounded-[var(--radius-large)] bg-surface shadow-[var(--shadow-hero)]", className)}>
      <PhotoSurface image={imageUrl ?? image ?? travelImages.istanbul} className={cn("h-[clamp(240px,66vw,260px)] p-5 text-white min-[420px]:p-6", isMemory && "aspect-[4/3] h-auto")}>
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="max-w-[210px] rounded-[var(--radius-small)] bg-white/18 px-3 py-1 text-[var(--type-caption-size)] font-medium leading-[var(--type-caption-line)] backdrop-blur-md">
              {location ?? "城市影像"}
            </span>
            {actionHref ? (
              <a
                href={actionHref}
                aria-label={actionLabel ?? "打开详情"}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-small)] bg-white/18 text-white backdrop-blur-md"
              >
                <Search className="h-5 w-5" strokeWidth={1.8} />
              </a>
            ) : (
              <div className="rounded-[var(--radius-small)] bg-white/18 p-2 backdrop-blur-md">
                {isMemory ? <Camera className="h-5 w-5" strokeWidth={1.8} /> : <Search className="h-5 w-5" strokeWidth={1.8} />}
              </div>
            )}
          </div>
          <div>
            {date ? <p className="mb-2 text-[var(--type-caption-size)] leading-[var(--type-caption-line)] text-white/80">{date}</p> : null}
            <div className="break-words font-serif text-[var(--type-display-size)] font-bold leading-[var(--type-display-line)] tracking-normal">{title}</div>
            {subtitle ? <p className="mt-3 max-w-[270px] text-pretty break-words text-[var(--type-body-size)] leading-[var(--type-body-line)] text-white/92">{subtitle}</p> : null}
          </div>
        </div>
        {weather ? (
          <div className="absolute right-4 top-4 flex h-9 w-[72px] items-center justify-center gap-1 rounded-[var(--radius-small)] bg-white/20 text-sm font-semibold backdrop-blur-[20px]">
            <CloudSun className="h-4 w-4 text-accent-orange" strokeWidth={1.8} />
            {weather}
          </div>
        ) : null}
      </PhotoSurface>
    </div>
  );
}

export function TimelineCard({
  variant = "morning",
  time,
  period,
  title,
  location,
  image,
  isLast,
}: {
  variant?: TimelineVariant;
  time: string;
  period: string;
  title: string;
  location?: string;
  image?: string;
  isLast?: boolean;
}) {
  const isTransport = variant === "transport";

  return (
    <div className="grid min-h-[72px] grid-cols-[42px_12px_minmax(0,1fr)_48px] gap-2 py-3 min-[420px]:grid-cols-[48px_14px_minmax(0,1fr)_52px] min-[420px]:gap-3">
      <div className="font-mono text-[12px] font-semibold leading-[var(--type-body-line)] text-ocean-blue min-[420px]:text-[var(--type-body-size)]">{time}</div>
      <div className="relative flex justify-center pt-2">
        <span className={cn("h-2 w-2 rounded-full", isTransport ? "bg-ocean-blue" : "bg-accent-orange")} />
        {!isLast ? <span className="absolute top-5 h-14 w-px bg-border-soft" /> : null}
      </div>
      <div className="min-w-0">
        <div className="text-[var(--type-caption-size)] font-medium leading-[var(--type-caption-line)] text-text-secondary">{period}</div>
        <div className="text-pretty break-words text-[var(--type-card-title-size)] font-semibold leading-tight tracking-normal text-text-primary">{title}</div>
        {location ? (
          <div className="mt-1 flex min-w-0 items-center gap-1 text-[var(--type-caption-size)] leading-[var(--type-caption-line)] text-text-secondary">
            <MapPin className="h-3 w-3 shrink-0 text-accent-orange" strokeWidth={1.8} />
            <span className="min-w-0 break-words">{location}</span>
          </div>
        ) : null}
      </div>
      {image ? (
        <PhotoSurface image={image} className="h-12 w-12 rounded-[var(--radius-small)] min-[420px]:h-[52px] min-[420px]:w-[52px]" />
      ) : (
        <div className="h-12 w-12 rounded-[var(--radius-small)] bg-surface-muted min-[420px]:h-[52px] min-[420px]:w-[52px]" />
      )}
    </div>
  );
}

function ExpandableText({
  children,
  className,
  threshold = 132,
}: {
  children: string;
  className?: string;
  threshold?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const shouldCollapse = children.length > threshold;

  return (
    <div>
      <p className={cn("text-pretty break-words", !expanded && shouldCollapse && "line-clamp-4", className)}>{children}</p>
      {shouldCollapse ? (
        <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-2 text-[var(--type-caption-size)] font-medium leading-[var(--type-caption-line)] text-accent-orange">
          {expanded ? "收起" : "展开"}
        </button>
      ) : null}
    </div>
  );
}

export function CultureInsightCard({
  variant = "culture",
  title,
  description,
  icon: Icon,
  detailTitle,
  detail,
  className,
}: {
  variant?: CultureInsightVariant;
  title?: string;
  description: string;
  icon?: LucideIcon;
  detailTitle?: string;
  detail?: string;
  className?: string;
}) {
  const InsightIcon = Icon ?? insightIcons[variant];

  return (
    <div className={cn("rounded-[var(--radius-medium)] border border-[color:rgba(215,181,109,0.32)] bg-[color:rgba(255,247,234,0.96)] p-5 shadow-[0_16px_42px_rgba(215,181,109,0.13)]", className)}>
      <div className="flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-small)] bg-white/70 text-ai-gold">
          <InsightIcon className="h-5 w-5" strokeWidth={1.8} />
        </div>
        <div>
          <h3 className="text-[var(--type-card-title-size)] font-semibold leading-tight text-text-primary">{title ?? insightTitles[variant]}</h3>
          <ExpandableText className="mt-2 text-[var(--type-body-size)] leading-[var(--type-body-line)] text-text-secondary">{description}</ExpandableText>
        </div>
      </div>
      {detail ? (
        <div className="mt-4 rounded-[var(--radius-medium)] bg-white/70 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Landmark className="h-4 w-4 text-accent-orange" strokeWidth={1.8} />
            {detailTitle ?? "Things to Know"}
          </div>
          <ExpandableText className="text-[var(--type-body-size)] leading-[var(--type-body-line)] text-text-secondary" threshold={110}>{detail}</ExpandableText>
        </div>
      ) : null}
    </div>
  );
}

export function RouteStopCard({
  city,
  country,
  dateRange,
  image,
  description,
  status = "upcoming",
  index,
  isLast,
}: {
  city: string;
  country?: string;
  dateRange?: string;
  image?: string;
  description?: string;
  status?: RouteStopStatus;
  index: number;
  isLast?: boolean;
}) {
  return (
    <div className="grid grid-cols-[28px_minmax(0,1fr)] gap-2 min-[420px]:grid-cols-[30px_minmax(0,1fr)] min-[420px]:gap-3">
      <div className="flex flex-col items-center">
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold", routeStatusStyles[status])}>{index + 1}</span>
        {!isLast ? <span className="mt-2 h-full min-h-9 w-px bg-border-soft" /> : null}
      </div>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_56px] gap-3 overflow-hidden rounded-[var(--radius-medium)] bg-white/88 p-4 shadow-[var(--shadow-soft-card)] min-[420px]:grid-cols-[minmax(0,1fr)_64px]">
        <div className="min-w-0 px-1 py-1">
          <div className="break-words text-[var(--type-card-title-size)] font-semibold leading-tight text-text-primary">{city}</div>
          <div className="mt-1 text-pretty break-words text-[var(--type-body-size)] leading-[var(--type-body-line)] text-text-secondary">
            {[country, dateRange].filter(Boolean).join(" · ")}
          </div>
          <p className="mt-3 line-clamp-2 text-pretty break-words text-[var(--type-caption-size)] leading-[var(--type-caption-line)] text-text-secondary">{description ?? "城市故事将在真实数据接入后展开。"}</p>
        </div>
        {image ? <PhotoSurface image={image} className="h-14 w-14 rounded-[16px] min-[420px]:h-16 min-[420px]:w-16" /> : <div className="h-14 w-14 rounded-[16px] bg-surface-muted min-[420px]:h-16 min-[420px]:w-16" />}
      </div>
    </div>
  );
}

export function MemoryCard({
  variant = "photo-text",
  image,
  date,
  location,
  sentence,
  story,
  className,
  isFeatured,
}: {
  variant?: MemoryVariant;
  image?: string;
  date?: string;
  location?: string;
  sentence?: string;
  story?: string;
  className?: string;
  isFeatured?: boolean;
}) {
  const hasStory = variant === "ai-memory" || Boolean(story);

  return (
    <div className={cn("overflow-hidden rounded-[var(--radius-large)] border border-white/70 bg-white/90 p-5 shadow-[0_18px_44px_rgba(83,58,36,0.09)]", isFeatured && "border-accent-orange/20 shadow-[0_22px_52px_rgba(83,58,36,0.12)]", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[var(--type-card-title-size)] font-semibold leading-[var(--type-card-title-line)] text-text-primary">{date ?? travelConfig.startDate}</div>
          <div className="text-[var(--type-body-size)] leading-[var(--type-body-line)] text-text-secondary">{location ?? `${travelConfig.cities[0]?.name ?? "旅程"} · 我的旅行手帐`}</div>
        </div>
        {isFeatured ? <div className="rounded-full bg-[color:rgba(232,138,74,0.12)] px-3 py-1 text-xs font-semibold text-accent-orange">最新</div> : null}
      </div>
      {image ? (
        <PhotoSurface image={image} className="mt-4 aspect-[4/3] rounded-[var(--radius-medium)]">
          <button type="button" className="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-[var(--radius-small)] bg-accent-orange text-white shadow-[0_14px_28px_rgba(232,138,74,0.28)]">
            <Camera className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </PhotoSurface>
      ) : null}
      {variant !== "photo" && sentence ? (
        <div className="mt-4 rounded-[var(--radius-medium)] bg-[color:rgba(255,250,242,0.96)] p-4">
          <p className="text-[18px] leading-[1.6] text-text-primary">{sentence}</p>
        </div>
      ) : null}
      {hasStory ? (
        <div className="mt-4 rounded-[var(--radius-medium)] bg-white p-4 shadow-[0_10px_30px_rgba(83,58,36,0.06)]">
          <div className="mb-2 text-[var(--type-card-title-size)] font-semibold leading-tight text-text-primary">AI 整理的记忆</div>
          <p className="whitespace-pre-line text-[var(--type-body-size)] leading-[var(--type-body-line)] text-text-secondary">{story ?? "未来会根据照片、地点和一句话整理成旅行记忆。"}</p>
        </div>
      ) : null}
    </div>
  );
}

export function ExpenseCard({
  variant = "other",
  category,
  title,
  amount,
  currency,
  location,
  date,
}: {
  variant?: ExpenseVariant;
  category: string;
  title?: string;
  amount: string;
  currency?: string;
  location?: string;
  date?: string;
}) {
  const icon = categoryIcons[category] ?? expenseVariantIcons[variant];

  return (
    <div className="flex items-center justify-between gap-3 rounded-[var(--radius-medium)] bg-white/72 px-3 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-small)] bg-[color:rgba(255,242,231,0.96)] text-lg">{icon}</div>
        <div className="min-w-0">
          <div className="break-words text-[var(--type-card-title-size)] font-semibold leading-tight text-text-primary">{title ?? category}</div>
          <div className="mt-1 break-words text-[var(--type-caption-size)] leading-[var(--type-caption-line)] text-text-secondary">{[category, location].filter(Boolean).join(" · ")}</div>
        </div>
      </div>
      <div className="max-w-[44%] shrink-0 text-right tabular-nums">
        <div className="break-words text-[var(--type-card-title-size)] font-semibold leading-tight text-text-primary">{amount}</div>
        <div className="mt-1 text-[var(--type-caption-size)] leading-[var(--type-caption-line)] text-text-secondary">{currency ?? date}</div>
      </div>
    </div>
  );
}

export function BudgetCard({
  budget,
  spent,
  remaining,
}: {
  budget: number;
  spent: number;
  remaining: number;
}) {
  const spentPercent = Math.min(99, Math.round((spent / Math.max(1, budget)) * 100));

  return (
    <div className="min-h-[180px] rounded-[var(--radius-large)] bg-[linear-gradient(135deg,rgba(232,138,74,0.9),rgba(244,122,43,0.8))] p-4 text-white shadow-[0_20px_44px_rgba(232,138,74,0.18)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[var(--type-body-size)] leading-[var(--type-body-line)] text-white/78">旅行预算</div>
          <div className="mt-3 break-words text-[clamp(34px,11vw,44px)] font-bold leading-none tabular-nums">{budget.toLocaleString()} {travelConfig.currency}</div>
        </div>
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-[7px] border-white/24 text-base font-semibold">{spentPercent}%</div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-[var(--radius-small)] bg-white/14 px-3 py-2">
          <div className="text-[var(--type-caption-size)] leading-[var(--type-caption-line)] text-white/70">已消费</div>
          <div className="mt-1 break-words text-base font-semibold tabular-nums">{spent.toLocaleString()} {travelConfig.currency}</div>
        </div>
        <div className="rounded-[var(--radius-small)] bg-white/14 px-3 py-2">
          <div className="text-[var(--type-caption-size)] leading-[var(--type-caption-line)] text-white/70">剩余</div>
          <div className="mt-1 break-words text-base font-semibold tabular-nums">{remaining.toLocaleString()} {travelConfig.currency}</div>
        </div>
      </div>
    </div>
  );
}

export function QuickActionButton({
  label,
  caption,
  icon: Icon,
  href,
}: {
  label: string;
  caption: string;
  icon: LucideIcon;
  href?: string;
}) {
  const className = "min-w-0 rounded-[var(--radius-small)] bg-white/88 px-3 py-4 text-left shadow-[0_12px_30px_rgba(83,58,36,0.07)]";
  const content = (
    <>
      <Icon className="mb-3 h-5 w-5 text-accent-orange" strokeWidth={1.8} />
      <div className="break-words text-[var(--type-body-size)] font-semibold leading-tight text-text-primary">{label}</div>
      <div className="mt-1 break-words text-[var(--type-caption-size)] leading-[var(--type-caption-line)] text-text-secondary">{caption}</div>
    </>
  );

  if (href) {
    return (
      <a href={href} className={className}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" className={className}>
      {content}
    </button>
  );
}

export function QuickActionBar() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <QuickActionButton label="问AI伙伴" caption="理解此刻" icon={Sparkles} href="/ai" />
      <QuickActionButton label="记录今天" caption="写入手帐" icon={NotebookPen} href="/journal/new" />
    </div>
  );
}

export function BottomNavigation({
  activeTab,
}: {
  activeTab: string;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 h-[calc(60px+env(safe-area-inset-bottom))] border-t border-[#eadfce]/80 bg-[var(--background)] px-2 pb-[env(safe-area-inset-bottom)] shadow-[var(--shadow-bottom-bar)]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-full h-[env(safe-area-inset-bottom)] bg-[var(--background)]" />
      <div className="relative mx-auto grid h-[60px] max-w-[430px] grid-cols-5">
        {bottomNavItems.map(({ href, label, icon: Icon }) => (
          <a key={href} href={href} className="relative flex flex-col items-center justify-center text-[var(--type-nav-label-size)] font-normal leading-[var(--type-nav-label-line)] text-text-secondary transition">
            <Icon className={cn("mb-0.5 h-[18px] w-[18px]", activeTab === href ? "text-accent-orange" : "text-text-secondary")} strokeWidth={1.8} />
            <span className="max-w-[56px] overflow-hidden text-ellipsis whitespace-nowrap" translate={label.includes("AI") ? "no" : undefined}>{label}</span>
            {activeTab === href ? <span className="absolute bottom-1 h-0.5 w-0.5 rounded-full bg-accent-orange" /> : null}
          </a>
        ))}
      </div>
    </nav>
  );
}

export function MobileCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("rounded-[var(--radius-medium)] border border-white/70 bg-white/90 shadow-[var(--shadow-soft-card)]", className)}>{children}</div>;
}

export function ArrowRow({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center justify-between rounded-[var(--radius-small)] bg-[color:rgba(255,250,242,0.96)] px-4 py-3 text-left text-[var(--type-body-size)] leading-[var(--type-body-line)] text-text-secondary">
      <span className="min-w-0 break-words">{children}</span>
      <ChevronRight className="h-4 w-4 text-accent-orange" strokeWidth={1.8} />
    </button>
  );
}

export { Plus, WalletCards, NotebookPen, MessageCircle };
