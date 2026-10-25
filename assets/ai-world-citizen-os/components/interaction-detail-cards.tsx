import type { LucideIcon } from "lucide-react";
import { ArrowLeft, BookOpen, Compass, MapPin, NotebookPen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoSurface, travelImages } from "@/components/travel-components";

export function DetailPageShell({
  title,
  eyebrow,
  backHref = "/",
  children,
}: {
  title: string;
  eyebrow: string;
  backHref?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-[100dvh] bg-background-warm pb-[calc(124px+env(safe-area-inset-bottom))] text-text-primary">
      <div className="mx-auto max-w-[430px] px-4 pb-5 pt-4 md:max-w-3xl">
        <header className="mb-4 flex min-h-12 items-center justify-between">
          <a href={backHref} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/86 text-text-primary shadow-[var(--shadow-soft-card)]" aria-label="返回">
            <ArrowLeft className="h-5 w-5" strokeWidth={1.8} />
          </a>
          <div className="text-right">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-orange">{eyebrow}</div>
            <h1 className="text-base font-semibold leading-tight">{title}</h1>
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}

export function ActivityDetailCard({
  image = travelImages.cappadocia,
  time,
  title,
  city,
  category,
  location,
  note,
  why,
  aiHref = "/ai",
}: {
  image?: string;
  time: string;
  title: string;
  city: string;
  category: string;
  location?: string | null;
  note?: string | null;
  why: string;
  aiHref?: string;
}) {
  return (
    <div className="space-y-4">
      <PhotoSurface image={image} className="h-[260px] rounded-[var(--radius-large)] p-5 text-white shadow-[var(--shadow-hero)]">
        <div className="flex h-full flex-col justify-end">
          <div className="font-mono text-sm font-semibold text-white/86">{time}</div>
          <div className="mt-2 font-serif text-[38px] font-bold leading-none">{title}</div>
          <div className="mt-3 text-sm text-white/88">{city} · {category}</div>
        </div>
      </PhotoSurface>

      <InfoBlock icon={Sparkles} title="Why This Matters" content={why} />
      <div className="rounded-[var(--radius-medium)] bg-white/90 p-5 shadow-[var(--shadow-soft-card)]">
        <h2 className="text-base font-semibold">Practical Info</h2>
        <div className="mt-4 space-y-3 text-sm text-text-secondary">
          <InfoRow label="时间" value={time} />
          <InfoRow label="城市" value={city} />
          {location ? <InfoRow label="地点" value={location} /> : null}
          <InfoRow label="分类" value={category} />
          <InfoRow label="备注" value={note || "根据当天节奏灵活安排，现场保留观察和记录时间。"} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Button asChild variant="secondary" className="h-12 rounded-[var(--radius-small)] px-2 text-xs">
          <a href="/#mobile-route">导航</a>
        </Button>
        <Button asChild className="h-12 rounded-[var(--radius-small)] px-2 text-xs">
          <a href={aiHref}>问AI伙伴</a>
        </Button>
        <Button asChild variant="secondary" className="h-12 rounded-[var(--radius-small)] px-2 text-xs">
          <a href="/journal">加入手帐</a>
        </Button>
      </div>
    </div>
  );
}

export function CityDetailContent({
  image = travelImages.istanbul,
  city,
  country,
  days,
  description,
  history,
  journeyRole,
  aiHref = "/ai",
}: {
  image?: string;
  city: string;
  country: string;
  days: string;
  description: string;
  history: string;
  journeyRole: string;
  aiHref?: string;
}) {
  return (
    <div className="space-y-4">
      <PhotoSurface image={image} className="h-[260px] rounded-[var(--radius-large)] p-5 text-white shadow-[var(--shadow-hero)]">
        <div className="flex h-full flex-col justify-end">
          <div className="text-sm text-white/86">{country} · {days}</div>
          <div className="mt-2 font-serif text-[40px] font-bold leading-none">{city}</div>
          <p className="mt-3 max-w-[280px] text-sm leading-[1.6] text-white/90">{description}</p>
        </div>
      </PhotoSurface>

      <InfoBlock icon={Compass} title="Why Here" content={description} />
      <InfoBlock icon={BookOpen} title="History" content={history} />
      <InfoBlock icon={MapPin} title="Journey Role" content={journeyRole} />

      <div className="grid grid-cols-3 gap-3">
        <Button asChild className="h-12 rounded-[var(--radius-small)] px-2 text-xs">
          <a href={aiHref}>AI伙伴</a>
        </Button>
        <Button asChild variant="secondary" className="h-12 rounded-[var(--radius-small)] px-2 text-xs">
          <a href="/#mobile-today">今日行程</a>
        </Button>
        <Button asChild variant="secondary" className="h-12 rounded-[var(--radius-small)] px-2 text-xs">
          <a href="/journal">写入手帐</a>
        </Button>
      </div>
    </div>
  );
}

export function AIHubEntry({
  icon: Icon,
  title,
  description,
  href,
  disabled,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
  disabled?: boolean;
}) {
  const content = (
    <div className="rounded-[var(--radius-medium)] bg-white/90 p-5 shadow-[var(--shadow-soft-card)]">
      <div className="flex gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-small)] bg-[color:rgba(255,242,231,0.96)] text-accent-orange">
          <Icon className="h-5 w-5" strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-2 text-sm leading-[1.6] text-text-secondary">{description}</p>
          {disabled ? <div className="mt-3 text-xs font-medium text-ai-gold">Coming Soon</div> : null}
        </div>
      </div>
    </div>
  );

  if (!href || disabled) {
    return content;
  }

  return (
    <a href={href} className="block rounded-[var(--radius-medium)] transition active:translate-y-px">
      {content}
    </a>
  );
}

function InfoBlock({ icon: Icon, title, content }: { icon: LucideIcon; title: string; content: string }) {
  return (
    <section className="rounded-[var(--radius-medium)] bg-white/90 p-5 shadow-[var(--shadow-soft-card)]">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-5 w-5 text-accent-orange" strokeWidth={1.8} />
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <p className="text-sm leading-[1.7] text-text-secondary">{content}</p>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-t border-border-soft pt-3">
      <span>{label}</span>
      <span className="max-w-[68%] text-right font-medium text-text-primary">{value}</span>
    </div>
  );
}

export { BookOpen, Compass, MapPin, NotebookPen, Sparkles };
