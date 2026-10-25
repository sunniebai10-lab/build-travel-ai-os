"use client";

import { CalendarDays, Compass, Map, Plane, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PhotoSurface, travelImages } from "@/components/travel-components";

type OnboardingStep = "welcome" | "create" | "planner" | "today";

const steps: OnboardingStep[] = ["welcome", "create", "planner", "today"];

export function ProductOnboarding() {
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const stepIndex = steps.indexOf(step);

  function nextStep() {
    setStep(steps[Math.min(stepIndex + 1, steps.length - 1)]);
  }

  return (
    <main className="min-h-[100dvh] bg-background-warm pb-[calc(32px+env(safe-area-inset-bottom))] text-text-primary">
      <div className="mx-auto max-w-[430px] px-4 py-4">
        <header className="mb-4 flex items-center justify-between">
          <a href="/" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/86 shadow-[var(--shadow-soft-card)]" aria-label="返回 Demo">
            <Compass className="h-5 w-5 text-accent-orange" strokeWidth={1.8} />
          </a>
          <div className="text-right">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-orange">Beta Onboarding</div>
            <div className="text-sm font-semibold">Step {stepIndex + 1} / {steps.length}</div>
          </div>
        </header>

        {step === "welcome" ? <WelcomeStep onNext={nextStep} /> : null}
        {step === "create" ? <CreateJourneyStep onNext={nextStep} /> : null}
        {step === "planner" ? <PlannerEntryStep onNext={nextStep} /> : null}
        {step === "today" ? <EmptyTodayStep /> : null}
      </div>
    </main>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-4">
      <PhotoSurface image={travelImages.notebook} className="h-[320px] rounded-[var(--radius-large)] p-5 text-white shadow-[var(--shadow-hero)]">
        <div className="flex h-full flex-col justify-end">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/78">Travel OS</div>
          <h1 className="mt-3 font-serif text-[42px] font-bold leading-none">世界旅行操作系统</h1>
          <p className="mt-4 max-w-[280px] text-sm leading-[1.7] text-white/90">
            不是攻略列表，而是帮助你规划、理解、记录一段真实旅程。
          </p>
        </div>
      </PhotoSurface>
      <Button type="button" onClick={onNext} className="h-12 w-full rounded-[var(--radius-small)]">
        开始创建第一段旅程
      </Button>
      <a href="/" className="block rounded-[var(--radius-small)] bg-white/80 px-4 py-3 text-center text-sm font-semibold text-text-secondary shadow-[var(--shadow-soft-card)]">
        查看我的旅程
      </a>
    </div>
  );
}

function CreateJourneyStep({ onNext }: { onNext: () => void }) {
  return (
    <section className="space-y-4 rounded-[var(--radius-large)] bg-white/90 p-5 shadow-[var(--shadow-soft-card)]">
      <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-small)] bg-[color:rgba(255,242,231,0.96)] text-accent-orange">
        <Plane className="h-6 w-6" strokeWidth={1.8} />
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-orange">Create First Journey</div>
        <h1 className="mt-3 font-serif text-[36px] font-bold leading-none">还没有旅程</h1>
        <p className="mt-4 text-sm leading-[1.7] text-text-secondary">
          先告诉 AI 你想去哪里、旅行几天、预算大概多少。MVP 阶段暂时只保存入口，不生成完整 itinerary。
        </p>
      </div>
      <div className="grid gap-3">
        <OnboardingField label="目的地" value="输入你的目的地" />
        <OnboardingField label="时间" value="输入开始和结束日期" />
        <OnboardingField label="偏好" value="历史、建筑、当地生活、摄影" />
      </div>
      <Button type="button" onClick={onNext} className="h-12 w-full rounded-[var(--radius-small)]">
        进入 AI Planner 入口
      </Button>
    </section>
  );
}

function PlannerEntryStep({ onNext }: { onNext: () => void }) {
  return (
    <section className="space-y-4 rounded-[var(--radius-large)] bg-white/90 p-5 shadow-[var(--shadow-soft-card)]">
      <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-small)] bg-[color:rgba(255,242,231,0.96)] text-accent-orange">
        <Sparkles className="h-6 w-6" strokeWidth={1.8} />
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-orange">AI Planner Entry</div>
        <h1 className="mt-3 font-serif text-[36px] font-bold leading-none">规划一次旅行</h1>
        <p className="mt-4 text-sm leading-[1.7] text-text-secondary">
          未来这里会把目的地、天数、预算和兴趣转成路线草案。现在先作为 Beta 入口，帮助新用户理解产品下一步。
        </p>
      </div>
      <div className="rounded-[var(--radius-medium)] bg-[color:rgba(255,250,242,0.96)] p-4 text-sm leading-[1.7] text-text-secondary">
        Planner 未来会生成：城市顺序、每日节奏、预算粗估、文化准备清单。
      </div>
      <a href="/planner" className="flex h-12 w-full items-center justify-center rounded-[var(--radius-small)] bg-accent-orange px-4 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(232,138,74,0.28)]">
        打开 AI Planner
      </a>
      <Button type="button" variant="secondary" onClick={onNext} className="h-12 w-full rounded-[var(--radius-small)]">
        先查看空旅程首页
      </Button>
    </section>
  );
}

function EmptyTodayStep() {
  return (
    <div className="space-y-4">
      <EmptyTodayState />
      <a href="/" className="block rounded-[var(--radius-small)] bg-white/80 px-4 py-3 text-center text-sm font-semibold text-text-secondary shadow-[var(--shadow-soft-card)]">
        返回 Demo Trip
      </a>
    </div>
  );
}

export function EmptyTodayState() {
  return (
    <section className="space-y-4 rounded-[var(--radius-large)] bg-white/90 p-5 shadow-[var(--shadow-soft-card)]">
      <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-small)] bg-[color:rgba(255,242,231,0.96)] text-accent-orange">
        <Map className="h-6 w-6" strokeWidth={1.8} />
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-orange">Today</div>
        <h1 className="mt-3 font-serif text-[38px] font-bold leading-none">还没有旅程</h1>
        <p className="mt-4 text-[18px] font-semibold leading-[1.45] text-text-primary">开始探索你的第一个世界</p>
        <p className="mt-3 text-sm leading-[1.7] text-text-secondary">
          创建旅程后，这里会变成你的每日旅行入口：今天在哪里、下一步去哪、这个地方为什么值得理解。
        </p>
      </div>
      <div className="rounded-[var(--radius-medium)] bg-[color:rgba(255,250,242,0.96)] p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
          <CalendarDays className="h-4 w-4 text-accent-orange" strokeWidth={1.8} />
          即将生成
        </div>
        <div className="space-y-2 text-sm leading-[1.6] text-text-secondary">
          <div>今日城市与天气</div>
          <div>今日路线和活动</div>
          <div>AI Local Companion 文化提醒</div>
          <div>Journal 与 Wallet 入口</div>
        </div>
      </div>
      <a href="/onboarding" className="flex h-12 w-full items-center justify-center rounded-[var(--radius-small)] bg-accent-orange px-4 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(232,138,74,0.28)]">
        创建旅程
      </a>
    </section>
  );
}

function OnboardingField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-small)] border border-border-soft bg-[color:rgba(255,250,242,0.96)] px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">{label}</div>
      <div className="mt-1 text-sm leading-[1.6] text-text-primary">{value}</div>
    </div>
  );
}
