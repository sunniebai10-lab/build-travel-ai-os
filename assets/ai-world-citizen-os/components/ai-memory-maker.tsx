"use client";

import travelConfig from "@/travel.config.json";

import { Check, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { saveJournalInput, saveJournalStory } from "@/lib/supabase/journal";
import { createInputId } from "@/lib/user-input-store";
import { getAuthRequestHeaders } from "@/lib/supabase/auth";
import type { AIMemoryContext, AIMemoryResponse } from "@/lib/ai";

type AIMemoryStatus = "idle" | "generating" | "draft" | "saving" | "saved" | "error";

function readArrayParam(value?: string) {
  return value ? value.split("|").map((item) => item.trim()).filter(Boolean) : [];
}

function createMemoryCacheKey(context: AIMemoryContext) {
  return [
    "ai-world-citizen:memory:v1",
    context.trip.city,
    context.activity?.title ?? context.trip.city,
    context.journal.date,
    context.journal.sentence,
    context.userContext.travelStyle,
    context.userContext.interests.join(","),
  ].join(":").toLowerCase();
}

function formatMemoryStory(memory: AIMemoryResponse) {
  return [
    memory.title,
    "",
    `My Experience：${memory.memory}`,
    "",
    `What I Learned：${memory.insight}`,
    "",
    `Emotion：${memory.emotion}`,
    "",
    `Reflection：${memory.reflection}`,
  ].join("\n");
}

function fallbackMemory(context: AIMemoryContext): AIMemoryResponse {
  const place = context.activity?.title || context.trip.city;
  return {
    title: "我把这里记住了",
    date: context.journal.date,
    place,
    memory: context.journal.sentence,
    insight: context.aiInsight?.whyImportant || context.aiInsight?.observe || `${place} 是这段旅程中值得被记住的一站。`,
    emotion: "这一刻让我感觉，旅行不只是抵达，也是慢慢理解。",
    reflection: "当一个地方和自己的感受连接起来，它就不再只是地图上的名字。",
    provider: "mock",
    source: "mock",
  };
}

export function AIMemoryMaker({
  journalId,
  city,
  country,
  date,
  sentence,
  photos,
  activityTitle,
  category,
  completed,
  whyImportant,
  history,
  observe,
  cultureTips,
}: {
  journalId?: string;
  city: string;
  country?: string;
  date: string;
  sentence: string;
  photos?: string;
  activityTitle?: string;
  category?: string;
  completed?: string;
  whyImportant?: string;
  history?: string;
  observe?: string;
  cultureTips?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<AIMemoryStatus>("idle");
  const [memory, setMemory] = useState<AIMemoryResponse | null>(null);

  const context = useMemo<AIMemoryContext>(() => ({
    trip: {
      name: travelConfig.name,
      country,
      city,
    },
    activity: activityTitle
      ? {
          title: activityTitle,
          category: category || "Experience",
          completed: completed === "true",
        }
      : undefined,
    journal: {
      id: journalId,
      sentence,
      date,
      photos: readArrayParam(photos),
    },
    aiInsight: {
      whyImportant,
      history,
      observe,
      cultureTips,
    },
    userContext: {
      travelStyle: "cultural exploration",
      interests: ["history", "architecture", "local culture", "photography"],
    },
  }), [activityTitle, category, city, completed, country, cultureTips, date, history, journalId, observe, photos, sentence, whyImportant]);

  const canGenerate = city.trim().length > 0 && sentence.trim().length > 0 && status !== "generating";

  async function generateMemory() {
    if (!canGenerate) return;
    setStatus("generating");
    const cacheKey = createMemoryCacheKey(context);

    try {
      const cached = window.localStorage.getItem(cacheKey);
      if (cached) {
        setMemory(JSON.parse(cached) as AIMemoryResponse);
        setStatus("draft");
        return;
      }

      const response = await fetch("/api/ai/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await getAuthRequestHeaders()) },
        body: JSON.stringify({ context }),
      });

      if (!response.ok) {
        throw new Error("AI Memory request failed.");
      }

      const data = (await response.json()) as { status: "success" | "error"; memory?: AIMemoryResponse };
      const nextMemory = data.memory ?? fallbackMemory(context);
      window.localStorage.setItem(cacheKey, JSON.stringify(nextMemory));
      setMemory(nextMemory);
      setStatus("draft");
    } catch {
      setMemory(fallbackMemory(context));
      setStatus("draft");
    }
  }

  async function saveMemory() {
    if (!memory) return;

    setStatus("saving");
    const story = formatMemoryStory(memory);

    if (journalId) {
      await saveJournalStory(journalId, story);
    } else {
      await saveJournalInput({
        id: createInputId("journal"),
        date,
        city,
        photos: readArrayParam(photos),
        sentence,
        story,
        createdAt: new Date().toISOString(),
      });
    }

    setStatus("saved");
    router.push("/journal");
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[var(--radius-large)] bg-white/90 p-5 shadow-[var(--shadow-soft-card)]">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-orange">AI Memory Maker</div>
        <h1 className="mt-3 font-serif text-[34px] font-bold leading-none text-text-primary">把这一刻整理成记忆</h1>
        <p className="mt-4 text-sm leading-[1.7] text-text-secondary">
          AI 会结合你的一句话、地点和现场理解，生成一张个人旅行记忆卡。
        </p>
      </section>

      <section className="rounded-[var(--radius-medium)] bg-white/90 p-5 shadow-[var(--shadow-soft-card)]">
        <div className="text-sm font-semibold text-text-primary">{date} · {city}</div>
        <p className="mt-3 text-[18px] leading-[1.6] text-text-primary">{sentence}</p>
        {activityTitle ? <p className="mt-3 text-sm leading-[1.6] text-text-secondary">Activity：{activityTitle} · {category ?? "Experience"}</p> : null}
      </section>

      {!memory ? (
        <Button type="button" onClick={generateMemory} disabled={!canGenerate} className="h-12 w-full rounded-[var(--radius-small)]">
          <Sparkles className="h-4 w-4" />
          {status === "generating" ? "正在整理这段记忆..." : "AI整理这段记忆"}
        </Button>
      ) : null}

      {memory ? (
        <section className="rounded-[var(--radius-large)] bg-white/90 p-5 shadow-[var(--shadow-soft-card)]">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ai-gold">Memory Draft</div>
          <h2 className="mt-2 font-serif text-[30px] font-bold leading-tight text-text-primary">{memory.title}</h2>
          <div className="mt-5 space-y-4">
            <MemoryBlock title="My Experience" content={memory.memory} />
            <MemoryBlock title="What I Learned" content={memory.insight} />
            <MemoryBlock title="Emotion" content={memory.emotion} />
            <MemoryBlock title="Reflection" content={memory.reflection} />
          </div>
          <Button type="button" onClick={saveMemory} disabled={status === "saving" || status === "saved"} className="mt-5 h-12 w-full rounded-[var(--radius-small)]">
            {status === "saved" ? <Check className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            {status === "saving" ? "正在保存..." : status === "saved" ? "已保存" : "确认并保存"}
          </Button>
        </section>
      ) : null}
    </div>
  );
}

function MemoryBlock({ title, content }: { title: string; content: string }) {
  return (
    <div className="rounded-[var(--radius-medium)] bg-[color:rgba(255,250,242,0.96)] p-4">
      <div className="text-sm font-semibold text-text-primary">{title}</div>
      <p className="mt-2 text-sm leading-[1.7] text-text-secondary">{content}</p>
    </div>
  );
}
