import {
  ArrowDown,
  BookOpen,
  CalendarDays,
  Camera,
  CircleDollarSign,
  CloudSun,
  Compass,
  Landmark,
  Map,
  NotebookPen,
  Plane,
  Plus,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MobileTravelOS } from "@/components/mobile-travel-os";
import { RouteMap } from "@/components/route-map";
import { getAccommodations } from "@/lib/supabase/accommodations";
import { getRouteCities } from "@/lib/supabase/cities";
import { getCountries } from "@/lib/supabase/countries";
import { getCultureEntries } from "@/lib/supabase/culture";
import { getFinance } from "@/lib/supabase/expenses";
import { getItinerary } from "@/lib/supabase/itinerary";
import { getSupabaseRuntimeStatus } from "@/lib/supabase/client";
import { getTransportation } from "@/lib/supabase/transportation";
import { getTrip } from "@/lib/supabase/trips";
import travelConfig from "@/travel.config.json";

export const dynamic = "force-dynamic";

const navItems = [
  ["01", "My Journey", "#journey"],
  ["02", "Route Map", "#route"],
  ["03", "Daily Explorer", "#daily"],
  ["04", "Culture Guide", "#culture"],
  ["05", "Travel Finance", "#finance"],
  ["06", "Travel Journal", "#journal"],
];

const flagLabels: Record<string, string> = Object.fromEntries(travelConfig.cities.map((city) => [city.code, city.country]));

function FlagPill({ code }: { code: string }) {
  return (
    <span className="rounded-full border border-border bg-white px-3 py-1 text-xs font-medium">
      {code} <span className="text-muted-foreground">{flagLabels[code]}</span>
    </span>
  );
}

function SectionLabel({ icon: Icon, label }: { icon: typeof Compass; label: string }) {
  return (
    <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
      <Icon className="h-4 w-4" />
      {label}
    </div>
  );
}

export default async function Home() {
  const [tripResult, countriesResult, citiesResult, itineraryResult, financeResult, accommodationsResult, transportationResult, cultureResult] = await Promise.all([
    getTrip(),
    getCountries(),
    getRouteCities(),
    getItinerary(),
    getFinance(),
    getAccommodations(),
    getTransportation(),
    getCultureEntries(),
  ]);
  const tripData = {
    ...tripResult.data,
    spent: financeResult.data.spent,
    remaining: financeResult.data.remaining,
    today: {
      ...tripResult.data.today,
      budget: `${financeResult.data.remaining.toLocaleString()} ${tripResult.data.currency} remaining`,
    },
  };
  const countries = countriesResult.data;
  const routeCities = citiesResult.data;
  const timeline = itineraryResult.data.timeline;
  const dailyPlan = itineraryResult.data.dailyPlan;
  const expenses = financeResult.data.expenses;
  const accommodations = accommodationsResult.data;
  const transportation = transportationResult.data;
  const cultureEntries = cultureResult.data;
  const usingFallback = [tripResult, countriesResult, citiesResult, itineraryResult, financeResult, accommodationsResult, transportationResult, cultureResult].some(
    (result) => result.source === "fallback",
  );
  const runtimeStatus = getSupabaseRuntimeStatus();
  return (
    <main className="min-h-[100dvh]">
      <MobileTravelOS
        trip={tripData}
        countries={countries}
        routeCities={routeCities}
        timeline={timeline}
        dailyPlan={dailyPlan}
        expenses={expenses}
        cultureEntries={cultureEntries}
        usingFallback={usingFallback}
        runtimeLabel={runtimeStatus.label}
      />

      <div className="hidden md:block">
      <header className="sticky top-0 z-30 border-b border-border bg-background/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <a href="#journey" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Compass className="h-4 w-4" />
            </span>
            <span className="font-semibold tracking-normal">{travelConfig.appName} · Travel Studio</span>
          </a>
          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map(([number, label, href]) => (
              <a
                key={href}
                href={href}
                className="rounded-full px-3 py-2 text-sm text-muted-foreground transition hover:bg-white hover:text-foreground"
              >
                <span className="font-mono text-[11px] text-accent">{number}</span> {label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <section id="journey" className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[1.12fr_0.88fr] lg:py-12">
        <div className="lg:col-span-2 rounded-lg border border-border bg-white px-5 py-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{runtimeStatus.label}</span>
          {usingFallback ? <span className="ml-2">暂时无法加载旅行数据，正在使用本地缓存。</span> : null}
        </div>
        <div className="rounded-lg border border-border bg-white p-6 lg:p-7">
          <SectionLabel icon={Plane} label="01 My Journey" />
          <div className="flex flex-wrap gap-2">
            {tripData.flags.map((flag) => (
              <FlagPill key={flag} code={flag} />
            ))}
          </div>
          <h1 className="mt-7 max-w-3xl text-5xl font-semibold leading-[1.02] tracking-normal md:text-[56px]">
            {tripData.name}
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-muted-foreground">
            <span className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-accent" />
              {tripData.dateRange}
            </span>
            <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium text-foreground">
              Day {tripData.currentDay} / {tripData.totalDays}
            </span>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="border-t border-border pt-4">
              <div className="text-sm text-muted-foreground">Total Budget</div>
              <div className="mt-2 text-2xl font-semibold">{tripData.budget.toLocaleString()} {tripData.currency}</div>
            </div>
            <div className="border-t border-border pt-4">
              <div className="text-sm text-muted-foreground">Current Focus</div>
              <div className="mt-2 text-2xl font-semibold">{tripData.today.city}</div>
            </div>
            <div className="border-t border-border pt-4">
              <div className="text-sm text-muted-foreground">Mode</div>
              <div className="mt-2 text-2xl font-semibold">Understand</div>
            </div>
          </div>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {[
              ["Route Map", `${routeCities.length} cities`],
              ["Itinerary", `${itineraryResult.data.count} items`],
              ["Edit Queue", "Studio ready"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-muted p-4">
                <div className="text-sm text-muted-foreground">{label}</div>
                <div className="mt-1 font-semibold">{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Today Card</CardTitle>
                <CloudSun className="h-5 w-5 text-accent" />
              </div>
              <CardDescription>The world you are entering today.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                <div>
                  <div className="text-sm text-muted-foreground">Current city</div>
                  <div className="mt-1 text-3xl font-semibold">{tripData.today.city}</div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-muted p-4">
                    <div className="text-muted-foreground">Weather</div>
                    <div className="mt-1 text-xl font-semibold">{tripData.today.weather}</div>
                  </div>
                  <div className="rounded-lg bg-muted p-4">
                    <div className="text-muted-foreground">Budget</div>
                    <div className="mt-1 text-xl font-semibold">{tripData.today.budget}</div>
                  </div>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <Landmark className="h-4 w-4 text-accent" />
                    Culture
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">{tripData.today.culture}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Today's Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {timeline.map((item) => (
                <div key={item.time} className="grid grid-cols-[56px_1fr] gap-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
                  <div className="font-mono text-sm text-accent">{item.time}</div>
                  <div>
                    <div className="font-medium">{item.title}</div>
                    <div className="mt-1 text-sm leading-6 text-muted-foreground">{item.detail}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="route" className="border-y border-border bg-white/50 py-12">
        <div className="mx-auto max-w-7xl px-5">
          <SectionLabel icon={Map} label="02 Route Map" />
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-4xl font-semibold tracking-normal">{tripData.name}</h2>
              <p className="mt-3 max-w-2xl text-muted-foreground">{tripData.dateRange}</p>
            </div>
            <Button variant="secondary">
              <ArrowDown className="h-4 w-4" />
              Explore Cities
            </Button>
          </div>
          <RouteMap cities={routeCities} />
        </div>
      </section>

      <section id="daily" className="mx-auto max-w-7xl px-5 py-12">
        <SectionLabel icon={Sparkles} label="03 Daily Explorer" />
        <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <h2 className="text-4xl font-semibold tracking-normal">{dailyPlan[0]?.date ?? "Daily Explorer"}</h2>
            <p className="mt-2 text-2xl text-muted-foreground">{dailyPlan[0]?.city ?? "No itinerary yet"}</p>
            <p className="mt-4 text-sm text-muted-foreground">{itineraryResult.data.count} itinerary items</p>
          </div>
          <div className="space-y-4">
            {dailyPlan.map((day) => (
              <Card key={`${day.date}-${day.city}`}>
                <CardHeader>
                  <CardTitle>{day.date}</CardTitle>
                  <CardDescription>{day.city}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {day.blocks.map((block) => (
                    <div key={`${day.date}-${block.title}-${block.time}`} className="grid gap-4 border-t border-border pt-4 first:border-t-0 first:pt-0 md:grid-cols-[150px_1fr]">
                      <div>
                        <div className="text-sm font-medium text-accent">{block.period}</div>
                        <div className="mt-1 font-mono text-2xl">{block.time}</div>
                      </div>
                      <div>
                        <h3 className="text-2xl font-semibold tracking-normal">{block.title}</h3>
                        <div className="mt-4 rounded-lg bg-muted p-4">
                          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                            <Sparkles className="h-4 w-4 text-accent" />
                            AI Insight
                          </div>
                          <p className="text-sm leading-6 text-muted-foreground">{block.ai}</p>
                          {block.category === "Planning" ? <p className="mt-2 text-xs font-medium text-accent">Planning</p> : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="culture" className="border-y border-border bg-white/50 py-12">
        <div className="mx-auto max-w-7xl px-5">
          <SectionLabel icon={BookOpen} label="04 Culture Guide" />
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <div className="space-y-2">
              {countries.map((country, index) => (
                <button
                  key={country.name}
                  type="button"
                  className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                    index === 0 ? "border-accent bg-white shadow-sm" : "border-border bg-transparent hover:bg-white"
                  }`}
                >
                  <div className="font-medium">{country.name}</div>
                  <div className="text-sm text-muted-foreground">{country.flag}</div>
                </button>
              ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>History</CardTitle>
                  <CardDescription>{countries[0]?.name ?? "Your journey"}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {countries[0].history.map((item, index) => (
                      <div key={item} className="grid grid-cols-[24px_1fr] gap-3">
                        <div className="flex flex-col items-center">
                          <span className="h-3 w-3 rounded-full bg-accent" />
                          {index < countries[0].history.length - 1 ? <span className="mt-2 h-8 w-px bg-border" /> : null}
                        </div>
                        <div className="font-medium">{item}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Things to know</CardTitle>
                  <CardDescription>Culture, lifestyle, and taboos.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <div className="mb-2 text-sm font-medium text-accent">Culture</div>
                    <div className="flex flex-wrap gap-2">
                      {countries[0].culture.map((item) => (
                        <span key={item} className="rounded-full bg-muted px-3 py-1 text-sm">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 text-sm font-medium text-accent">Taboo</div>
                    <div className="space-y-2">
                      {countries[0].taboo.map((item) => (
                        <div key={item} className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section id="finance" className="mx-auto max-w-7xl px-5 py-12">
        <SectionLabel icon={CircleDollarSign} label="05 Travel Finance" />
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Budget Overview</CardTitle>
              <CardDescription>{tripData.currency} base currency with travel-currency records.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
                {[
                  ["Total Budget", `${tripData.budget.toLocaleString()} ${tripData.currency}`],
                  ["Spent", `${tripData.spent.toLocaleString()} ${tripData.currency}`],
                  ["Remaining", `${tripData.remaining.toLocaleString()} ${tripData.currency}`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-muted p-4">
                    <div className="text-sm text-muted-foreground">{label}</div>
                    <div className="mt-2 text-3xl font-semibold">{value}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Expense List</CardTitle>
                  <CardDescription>Automatic FX conversion ready for Supabase records.</CardDescription>
                </div>
                <Button size="icon" aria-label="Add expense">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {expenses.map((expense) => (
                  <div key={`${expense.date}-${expense.title}`} className="grid gap-3 py-4 first:pt-0 md:grid-cols-[84px_1fr_110px]">
                    <div className="font-mono text-sm text-accent">{expense.date}</div>
                    <div>
                      <div className="font-medium">{expense.title}</div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{expense.category}</span>
                        <span>{expense.location}</span>
                      </div>
                    </div>
                    <div className="text-left md:text-right">
                      <div className="font-medium">{expense.amount}</div>
                      <div className="text-sm text-muted-foreground">{expense.rmb}</div>
                    </div>
                  </div>
                ))}
              </div>
              {accommodations.length ? (
                <div className="mt-6 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                  真实住宿记录：{accommodations.length} 条 · 交通记录：{transportation.length} 条
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="journal" className="border-t border-border bg-white/50 py-12">
        <div className="mx-auto max-w-7xl px-5">
          <SectionLabel icon={NotebookPen} label="06 Travel Journal" />
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-4xl font-semibold tracking-normal">Memory, not content.</h2>
              <p className="mt-3 max-w-2xl text-muted-foreground">A daily place for one sentence, a few photos, and an AI memory that helps the day settle.</p>
            </div>
            <Button>
              <Camera className="h-4 w-4" />
              Add Entry
            </Button>
          </div>
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <CardHeader>
                <CardTitle>我的旅行手帐</CardTitle>
                <CardDescription>Travel Journal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="aspect-square rounded-lg bg-[linear-gradient(135deg,#dfe8e1,#ffffff)]" />
                  <div className="aspect-square rounded-lg bg-[linear-gradient(135deg,#cfdad6,#edf1ef)]" />
                  <button type="button" className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-border bg-white">
                    <Plus className="h-5 w-5 text-accent" />
                  </button>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <div className="mb-2 text-sm font-medium text-accent">空状态</div>
                  <p className="leading-7">你的旅行手帐将在旅程开始后生成。</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <WalletCards className="h-5 w-5 text-accent" />
                  <CardTitle>AI Memory</CardTitle>
                </div>
                <CardDescription>Generated from your future travel memories.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xl leading-9 text-foreground">还没有手帐故事。等第一张照片和第一句话抵达这里。</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      </div>
    </main>
  );
}
