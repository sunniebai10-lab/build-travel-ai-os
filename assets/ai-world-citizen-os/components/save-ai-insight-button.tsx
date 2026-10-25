"use client";

import { Check, NotebookPen } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { saveJournalInput } from "@/lib/supabase/journal";
import type { AITextResponse } from "@/lib/ai";
import { createInputId } from "@/lib/user-input-store";

function buildInsightStory(response: AITextResponse) {
  const structured = [
    response.whyImportant ? `为什么这里重要：${response.whyImportant}` : "",
    response.history ? `历史背景：${response.history}` : "",
    response.observe ? `你可以观察什么：${response.observe}` : response.observationGuide ? `你可以观察什么：${response.observationGuide}` : "",
    response.cultureTips ? `当地文化提醒：${response.cultureTips}` : "",
    response.localAdvice ? `旅行建议：${response.localAdvice}` : "",
  ].filter(Boolean);
  const sections = (response.sections ?? [])
    .map((section) => `${section.title}：${section.content}`)
    .join("\n");
  const tips = response.tips?.length ? `\n现场提醒：${response.tips.join(" / ")}` : "";
  return [response.summary, structured.length ? structured.join("\n") : sections, tips].filter(Boolean).join("\n\n");
}

export function SaveAIInsightButton({
  response,
  city,
  place,
}: {
  response?: AITextResponse;
  city: string;
  place: string;
}) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  async function handleSave() {
    if (!response || status !== "idle") return;

    setStatus("saving");
    await saveJournalInput({
      id: createInputId("journal"),
      date: new Date().toISOString().slice(0, 10),
      city,
      photos: [],
      sentence: `今天在${place}，我多理解了这个地方一点。`,
      story: buildInsightStory(response),
      createdAt: new Date().toISOString(),
    });
    setStatus("saved");
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant={status === "saved" ? "secondary" : "default"}
        onClick={handleSave}
        disabled={!response || status !== "idle"}
        className="h-11 w-full rounded-[var(--radius-small)]"
      >
        {status === "saved" ? <Check className="h-4 w-4" /> : <NotebookPen className="h-4 w-4" />}
        {status === "saving" ? "正在保存..." : status === "saved" ? "已保存到手帐" : "保存到手帐"}
      </Button>
      {status === "saved" ? (
        <a href="/journal" className="block rounded-[var(--radius-small)] bg-[color:rgba(255,250,242,0.96)] px-4 py-3 text-center text-sm font-semibold text-accent-orange">
          去手帐查看
        </a>
      ) : null}
    </div>
  );
}
