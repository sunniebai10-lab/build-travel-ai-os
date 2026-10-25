"use client";

import { Check, Loader2, RotateCcw, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getAuthRequestHeaders } from "@/lib/supabase/auth";
import { getJournalEntries, saveJournalInput, type JournalEntryView } from "@/lib/supabase/journal";
import { readLocalTripMemoryInsights } from "@/lib/ai/cache";
import { createInputId } from "@/lib/user-input-store";
import { formatTripMemoryStory } from "@/lib/ai/trip-memory";
import type { TripMemoryResponse } from "@/lib/ai/types";

type TripMemoryStatus = "idle" | "loading" | "draft" | "saving" | "saved" | "error";

type PhotoOption = {
  id: string;
  preview: string;
  value: string;
  city: string;
  date: string;
};

function buildPhotoOptions(journals: JournalEntryView[]): PhotoOption[] {
  return journals.flatMap((journal) => journal.photos.map((preview, index) => ({
    id: `${journal.id}-${index}`,
    preview,
    value: journal.photoRefs?.[index] ?? preview,
    city: journal.city,
    date: journal.date,
  }))).slice(0, 9);
}

function MemoryList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-[var(--radius-medium)] bg-[color:rgba(255,250,242,0.96)] p-4">
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      <ul className="mt-2 space-y-2 text-sm leading-[1.7] text-text-secondary">
        {items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}
      </ul>
    </section>
  );
}

export function TripMemoryMaker() {
  const router = useRouter();
  const [status, setStatus] = useState<TripMemoryStatus>("idle");
  const [memory, setMemory] = useState<TripMemoryResponse | null>(null);
  const [journals, setJournals] = useState<JournalEntryView[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [tripEndDate, setTripEndDate] = useState("");

  const photoOptions = useMemo(() => buildPhotoOptions(journals), [journals]);

  useEffect(() => {
    void getJournalEntries().then((result) => {
      setJournals(result.data);
      setSelectedPhotos(buildPhotoOptions(result.data).slice(0, 3).map((photo) => photo.value));
    });
  }, []);

  function togglePhoto(value: string) {
    setSelectedPhotos((current) => {
      if (current.includes(value)) return current.filter((photo) => photo !== value);
      return current.length >= 3 ? current : [...current, value];
    });
  }

  async function generateDraft() {
    setStatus("loading");
    setError("");

    try {
      const cityNames = [...new Set(journals.map((journal) => journal.city).filter(Boolean))];
      const response = await fetch("/api/ai/trip-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await getAuthRequestHeaders()) },
        body: JSON.stringify({ aiInsights: readLocalTripMemoryInsights(cityNames) }),
      });
      const data = (await response.json()) as {
        status: "success" | "error";
        memory?: TripMemoryResponse;
        context?: { trip?: { endDate?: string } };
        error?: string;
      };

      if (!response.ok || !data.memory) {
        throw new Error(data.error ?? `AI request failed: ${response.status}`);
      }

      setMemory(data.memory);
      setTripEndDate(data.context?.trip?.endDate ?? "");
      setStatus("draft");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "暂时无法整理这次旅程。");
      setStatus("error");
    }
  }

  async function saveMemory() {
    if (!memory) return;

    setStatus("saving");
    const result = await saveJournalInput({
      id: createInputId("trip-memory"),
      date: tripEndDate || new Date().toISOString().slice(0, 10),
      city: "Trip Memory",
      photos: selectedPhotos,
      sentence: "My Trip Memory",
      story: formatTripMemoryStory(memory),
      createdAt: new Date().toISOString(),
    }, { fallbackToLocal: false });

    if (result.source === "supabase") {
      setStatus("saved");
      router.push("/journal");
      return;
    }

    setError("暂时无法保存到云端。请确认已登录并检查网络后重试。");
    setStatus("error");
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[var(--radius-large)] bg-white/90 p-5 shadow-[var(--shadow-soft-card)]">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-orange">Trip Memory</div>
        <h1 className="mt-3 font-serif text-[34px] font-bold leading-none text-text-primary">整理我的这次旅程</h1>
        <p className="mt-4 text-sm leading-[1.7] text-text-secondary">
          AI 会从你已保存的手帐、完成活动、行程与主动查看过的洞察中整理一份旅行回顾。草稿不会自动保存。
        </p>
      </section>

      {photoOptions.length ? (
        <section className="rounded-[var(--radius-medium)] bg-white/90 p-5 shadow-[var(--shadow-soft-card)]">
          <h2 className="text-base font-semibold text-text-primary">选择代表照片</h2>
          <p className="mt-2 text-sm leading-[1.6] text-text-secondary">最多选择 3 张，会随旅行回顾一起保存。</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {photoOptions.map((photo) => {
              const selected = selectedPhotos.includes(photo.value);
              return (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => togglePhoto(photo.value)}
                  aria-pressed={selected}
                  className={`relative aspect-[4/3] overflow-hidden rounded-[var(--radius-small)] border-2 ${selected ? "border-accent-orange" : "border-transparent"}`}
                >
                  {/* The source ref is preserved separately; this is only a signed preview. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.preview} alt={`${photo.city} ${photo.date}`} className="h-full w-full object-cover" />
                  {selected ? <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent-orange text-white"><Check className="h-3.5 w-3.5" /></span> : null}
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {!memory ? (
        <Button type="button" onClick={generateDraft} disabled={status === "loading"} className="h-12 w-full rounded-[var(--radius-small)]">
          {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {status === "loading" ? "正在整理你的旅程..." : "生成旅行回顾草稿"}
        </Button>
      ) : null}

      {status === "error" ? (
        <p className="rounded-[var(--radius-small)] bg-white/80 p-4 text-sm leading-[1.6] text-text-secondary">{error}</p>
      ) : null}

      {memory ? (
        <section className="rounded-[var(--radius-large)] bg-white/90 p-5 shadow-[var(--shadow-soft-card)]">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ai-gold">
            {memory.mode === "planning_draft" ? "Planning Memory Draft" : "Memory Draft"}
          </div>
          <h2 className="mt-2 font-serif text-[30px] font-bold leading-tight text-text-primary">{memory.title}</h2>
          {memory.mode === "planning_draft" ? (
            <p className="mt-3 text-sm leading-[1.6] text-text-secondary">这是一份出发前草稿。等你写下第一条手帐，它会逐步变成属于你的旅行回顾。</p>
          ) : null}
          <div className="mt-5 space-y-4">
            <section className="rounded-[var(--radius-medium)] bg-[color:rgba(255,250,242,0.96)] p-4">
              <h3 className="text-sm font-semibold text-text-primary">Trip Overview</h3>
              <p className="mt-2 text-sm leading-[1.7] text-text-secondary">{memory.tripOverview}</p>
            </section>
            <MemoryList title="Important Places" items={memory.importantPlaces} />
            <MemoryList title="Personal Highlights" items={memory.personalHighlights} />
            <MemoryList title="Cultural Insights" items={memory.culturalInsights} />
            <MemoryList title="Favorite Moments" items={memory.favoriteMoments} />
            <section className="rounded-[var(--radius-medium)] bg-[color:rgba(255,250,242,0.96)] p-4">
              <h3 className="text-sm font-semibold text-text-primary">Travel Style</h3>
              <p className="mt-2 text-sm leading-[1.7] text-text-secondary">{memory.travelStyle}</p>
            </section>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Button type="button" variant="secondary" onClick={generateDraft} disabled={status === "loading" || status === "saving"} className="h-12 rounded-[var(--radius-small)]">
              <RotateCcw className="h-4 w-4" />重新生成
            </Button>
            <Button type="button" onClick={saveMemory} disabled={status === "saving" || status === "saved"} className="h-12 rounded-[var(--radius-small)]">
              {status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {status === "saving" ? "正在保存..." : "保存到手帐"}
            </Button>
          </div>
          <Button type="button" variant="ghost" onClick={() => router.push("/journal")} className="mt-2 h-11 w-full rounded-[var(--radius-small)] text-text-secondary">
            <X className="h-4 w-4" />取消
          </Button>
        </section>
      ) : null}
    </div>
  );
}
