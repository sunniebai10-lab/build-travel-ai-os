import type { AIPlannerDraft, AIPlannerInput } from "@/lib/ai/types";

export interface PlannerJourneyDraft {
  id: string;
  input: AIPlannerInput;
  draft: AIPlannerDraft;
  createdAt: string;
}

const plannerDraftKey = "ai-world-citizen:planner-drafts";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function createPlannerId() {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return `planner-${window.crypto.randomUUID()}`;
  }
  return `planner-${Date.now()}`;
}

export function getPlannerJourneyDrafts() {
  return readJson<PlannerJourneyDraft[]>(plannerDraftKey, []);
}

export function savePlannerJourneyDraft(input: AIPlannerInput, draft: AIPlannerDraft) {
  const nextDraft: PlannerJourneyDraft = {
    id: createPlannerId(),
    input,
    draft,
    createdAt: new Date().toISOString(),
  };
  const next = [nextDraft, ...getPlannerJourneyDrafts()];
  writeJson(plannerDraftKey, next);
  return nextDraft;
}
