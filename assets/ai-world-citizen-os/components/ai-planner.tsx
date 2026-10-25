"use client";

import { Check, Loader2, Route, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { savePlannerJourneyDraft } from "@/lib/planner-store";
import { getAuthRequestHeaders } from "@/lib/supabase/auth";
import type { AIPlannerDraft, AIPlannerInput } from "@/lib/ai";
import travelConfig from "@/travel.config.json";

type PlannerStatus = "idle" | "generating" | "draft" | "saved" | "error";

function splitInterests(value: string) {
  return value
    .split(/[,，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function AIPlannerForm() {
  const [destination, setDestination] = useState(travelConfig.cities.map((city) => city.name).join(", "));
  const [dates, setDates] = useState(`${travelConfig.startDate} - ${travelConfig.endDate}`);
  const [duration, setDuration] = useState("Travel dates above");
  const [budget, setBudget] = useState(`${travelConfig.budget} ${travelConfig.currency}`);
  const [interests, setInterests] = useState("history, architecture, local culture, photography");
  const [travelStyle, setTravelStyle] = useState("cultural exploration");
  const [status, setStatus] = useState<PlannerStatus>("idle");
  const [draft, setDraft] = useState<AIPlannerDraft | null>(null);
  const [error, setError] = useState("");

  const input = useMemo<AIPlannerInput>(() => ({
    destination: destination.trim(),
    dates: dates.trim(),
    duration: duration.trim(),
    budget: budget.trim(),
    interests: splitInterests(interests),
    travelStyle: travelStyle.trim(),
  }), [budget, dates, destination, duration, interests, travelStyle]);

  const canGenerate = input.destination.length > 0 && input.duration.length > 0 && status !== "generating";

  async function generateDraft() {
    if (!canGenerate) return;
    setStatus("generating");
    setError("");

    try {
      const response = await fetch("/api/ai/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await getAuthRequestHeaders()) },
        body: JSON.stringify({ input }),
      });

      if (!response.ok) {
        throw new Error("AI Planner request failed.");
      }

      const data = (await response.json()) as { status: "success" | "error"; draft?: AIPlannerDraft; error?: string };
      if (!data.draft) {
        throw new Error(data.error ?? "AI Planner did not return a draft.");
      }

      setDraft(data.draft);
      setStatus("draft");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "AI Planner failed.");
      setStatus("error");
    }
  }

  function confirmTrip() {
    if (!draft) return;
    savePlannerJourneyDraft(input, draft);
    setStatus("saved");
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[var(--radius-large)] bg-white/90 p-5 shadow-[var(--shadow-soft-card)]">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-orange">AI Planner MVP</div>
        <h1 className="mt-3 font-serif text-[38px] font-bold leading-none">规划一次旅行</h1>
        <p className="mt-4 text-sm leading-[1.7] text-text-secondary">
          先生成路线草案，理解为什么这样安排。MVP 不查询机票、酒店或实时价格。
        </p>
      </section>

      <section className="space-y-4 rounded-[var(--radius-large)] bg-white/90 p-5 shadow-[var(--shadow-soft-card)]">
        <PlannerInput label="Destination" value={destination} onChange={setDestination} placeholder="Country or city" />
        <PlannerInput label="Dates" value={dates} onChange={setDates} placeholder="YYYY-MM-DD - YYYY-MM-DD" />
        <div className="grid grid-cols-2 gap-3">
          <PlannerInput label="Duration" value={duration} onChange={setDuration} placeholder="10 days" />
          <PlannerInput label="Budget" value={budget} onChange={setBudget} placeholder={`Amount in ${travelConfig.currency}`} />
        </div>
        <PlannerInput label="Interests" value={interests} onChange={setInterests} placeholder="history, food, photography" />
        <PlannerInput label="Travel Style" value={travelStyle} onChange={setTravelStyle} placeholder="slow cultural travel" />

        <Button type="button" onClick={generateDraft} disabled={!canGenerate} className="h-12 w-full rounded-[var(--radius-small)]">
          {status === "generating" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {status === "generating" ? "正在生成路线草案..." : "生成 AI Route Draft"}
        </Button>
        {status === "error" ? <p className="text-sm leading-[1.6] text-text-secondary">{error || "暂时无法生成路线草案。"}</p> : null}
      </section>

      {draft ? (
        <section className="space-y-4 rounded-[var(--radius-large)] bg-white/90 p-5 shadow-[var(--shadow-soft-card)]">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-ai-gold">
            <Route className="h-4 w-4" strokeWidth={1.8} />
            AI Route Draft
          </div>
          <div>
            <h2 className="font-serif text-[32px] font-bold leading-tight text-text-primary">{draft.title}</h2>
            <p className="mt-3 text-sm leading-[1.7] text-text-secondary">{draft.theme}</p>
          </div>
          <div className="rounded-[var(--radius-medium)] bg-[color:rgba(255,250,242,0.96)] p-4">
            <div className="text-sm font-semibold text-text-primary">Route</div>
            <p className="mt-2 text-sm leading-[1.7] text-text-secondary">{draft.route}</p>
          </div>
          <div className="rounded-[var(--radius-medium)] bg-[color:rgba(255,250,242,0.96)] p-4">
            <div className="text-sm font-semibold text-text-primary">Why This Route</div>
            <p className="mt-2 text-sm leading-[1.7] text-text-secondary">{draft.reasoning}</p>
          </div>
          <div className="space-y-3">
            {draft.dailyOutline.map((day) => (
              <div key={`${day.day}-${day.city}`} className="rounded-[var(--radius-medium)] border border-border-soft bg-white/80 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-orange">{day.day}</div>
                <div className="mt-2 text-base font-semibold text-text-primary">{day.city}</div>
                <div className="mt-2 text-sm font-medium text-text-primary">{day.focus}</div>
                <p className="mt-2 text-sm leading-[1.7] text-text-secondary">{day.reason}</p>
              </div>
            ))}
          </div>
          <Button type="button" onClick={confirmTrip} disabled={status === "saved"} className="h-12 w-full rounded-[var(--radius-small)]">
            {status === "saved" ? <Check className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            {status === "saved" ? "已创建旅程草案" : "确认创建旅程"}
          </Button>
          {status === "saved" ? (
            <p className="text-center text-sm leading-[1.6] text-text-secondary">
              草案已保存在本机。下一阶段可以接入 Supabase，把它写入 trips 和 itinerary。
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function PlannerInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-[var(--radius-small)] border border-border-soft bg-white px-4 text-base outline-none focus:ring-2 focus:ring-accent-orange/30"
      />
    </label>
  );
}
