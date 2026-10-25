import { buildTravelContext } from "@/lib/ai/context-builder";
import { getTaskForIntent } from "@/lib/ai/intents";
import { routeAIRequest } from "@/lib/ai/model-router";
import { mockProvider } from "@/lib/ai/mock-provider";
import { createLocalCompanionCacheKey, readLocalCompanionCache, writeLocalCompanionCache } from "@/lib/ai/cache";
import { getAuthRequestHeaders } from "@/lib/supabase/auth";
import type { AIIntent } from "@/lib/ai/intents";
import type { AICompanionResult, AITask, BuildTravelContextInput, TravelAIContext } from "@/lib/ai/types";

export type {
  AICompanionResult,
  AIImageRequest,
  AIProvider,
  AIProviderName,
  AIMemoryContext,
  AIMemoryResponse,
  TripMemoryContext,
  TripMemoryInsight,
  TripMemoryResponse,
  AIPlannerDraft,
  AIPlannerDay,
  AIPlannerInput,
  AITextRequest,
  AITextResponse,
  AITask,
  BuildTravelContextInput,
  TravelAIContext,
} from "@/lib/ai/types";

export { buildEnhancedTravelContext, buildTravelContext } from "@/lib/ai/context-builder";
export { aiIntentDefinitions, getTaskForIntent, suggestedIntentQuestions } from "@/lib/ai/intents";
export type { AIIntent, AIIntentDefinition } from "@/lib/ai/intents";
export { detectJourneyStage } from "@/lib/ai/journey-stage";
export { getModelFamily, routeAIRequest } from "@/lib/ai/model-router";
export { buildLocalCompanionPrompt, localCompanionResponseSchema, localCompanionSystemPrompt } from "@/lib/ai/prompts";
export { getMockCompanionDemo, mockProvider } from "@/lib/ai/mock-provider";
export { getDefaultUserContext, defaultTravelProfile } from "@/lib/ai/user-profile";

function buildLocalCultureFallback(context: TravelAIContext, intent: AIIntent, task: AITask) {
  const history = context.culture.history[0] ?? context.culture.entries.find((entry) => entry.category.toLowerCase().includes("history"))?.content;
  const culture = context.culture.culture[0] ?? context.culture.entries.find((entry) => entry.category.toLowerCase().includes("culture"))?.content;
  const taboo = context.culture.taboo[0] ?? context.culture.entries.find((entry) => entry.category.toLowerCase().includes("taboo"))?.content;
  const aiNote = context.itinerary.aiNote;
  const place = context.location.place ?? context.location.city;
  const summary = aiNote || culture || history || `${place} 是这段旅程中值得慢慢理解的一站。`;

  return {
    intent,
    title: "先理解这里",
    summary,
    sections: [
      { title: "为什么重要", content: summary },
      { title: "历史背景", content: history || summary },
      { title: "观察什么", content: aiNote || `你可以从 ${place} 的空间、动线和日常细节开始观察。` },
    ],
    tips: [taboo || "放慢一点观察现场。"],
    whyImportant: summary,
    history: history || summary,
    observe: aiNote || summary,
    cultureTips: culture || taboo || "尊重现场秩序，先观察再行动。",
    observationGuide: aiNote || summary,
    localAdvice: taboo || "放慢一点，把这个地方放进今天的旅程里理解。",
    provider: "mock" as const,
    task,
    source: "mock" as const,
  };
}

export async function getLocalCompanionInsight({
  intent = "understand",
  task,
  question,
  ...contextInput
}: BuildTravelContextInput & {
  intent?: AIIntent;
  task?: AITask;
  question?: string;
}): Promise<AICompanionResult> {
  try {
    const builtContext = buildTravelContext({ ...contextInput, intent });
    const browserContext = builtContext.location.place
      ? builtContext
      : { ...builtContext, location: { ...builtContext.location, place: builtContext.location.city } };

    if (!browserContext.location.place) {
      const resolvedTask = task ?? getTaskForIntent(intent);
      return {
        status: "success",
        response: {
          intent,
          title: "选择一个地点",
          summary: "先选择你想理解的地点，AI 伙伴才能结合旅程背景提供现场洞察。",
          sections: [
            { title: "下一步", content: "从路线、今日行程或城市详情进入一个具体地点。" },
            { title: "为什么", content: "AI 需要知道你此刻在哪里，才能避免泛泛而谈。" },
          ],
          tips: ["选择地点后再开始探索。"],
          whyImportant: "地点缺失时，AI 无法判断应该解释哪段历史或文化背景。",
          history: "请选择一个具体地点后再查看历史背景。",
          observe: "请选择地点后，AI 会告诉你现场可以观察的细节。",
          cultureTips: "请选择地点后，AI 会结合当地文化边界给出提醒。",
          observationGuide: "请选择地点后，AI 会生成观察建议。",
          localAdvice: "从今日行程或路线城市进入，会获得更准确的旅行建议。",
          provider: "mock",
          task: resolvedTask,
          source: "mock",
        },
      };
    }

    if (typeof window !== "undefined") {
      const cacheKey = createLocalCompanionCacheKey({ context: browserContext, intent, question });
      const cached = readLocalCompanionCache(cacheKey);
      if (cached) {
        return cached;
      }

      const url = "/api/ai/local-companion";
      let response: Response | undefined;

      try {
        response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(await getAuthRequestHeaders()) },
          body: JSON.stringify({ intent, task, question, contextInput }),
        });

        if (!response.ok) {
          const error = `AI request failed: ${response.status}`;
          return { status: "error", error };
        }

        const result = (await response.json()) as AICompanionResult;
        writeLocalCompanionCache(cacheKey, result);
        return result;
      } catch (error) {
        const detail = error instanceof Error ? `${error.name}: ${error.message}` : "Unknown client request error";
        return {
          status: "error",
          error: response ? `AI response failed: ${response.status}` : `Network request failed: ${detail}`,
        };
      }
    }

    const resolvedTask = task ?? getTaskForIntent(intent);
    const context = browserContext;
    const routedProvider = routeAIRequest({ task: resolvedTask });
    const shouldUseDeepSeek =
      routedProvider === "deepseek" &&
      Boolean(process.env.DEEPSEEK_API_KEY) &&
      resolvedTask !== "image_analysis" &&
      resolvedTask !== "image_memory" &&
      resolvedTask !== "memory_generation" &&
      resolvedTask !== "place_recognition";

    let response;
    if (shouldUseDeepSeek) {
      try {
        response = await (await import("@/lib/ai/providers/deepseek")).deepSeekProvider.generateText({ task: resolvedTask, intent, question, context });
      } catch {
        if (intent === "freeform") {
          return { status: "error", error: "AI could not answer this question right now." };
        }
        try {
          response = await mockProvider.generateText({ task: resolvedTask, intent, question, context });
        } catch {
          response = buildLocalCultureFallback(context, intent, resolvedTask);
        }
      }
    } else {
      try {
        response =
          resolvedTask === "image_analysis" || resolvedTask === "image_memory" || resolvedTask === "memory_generation" || resolvedTask === "place_recognition"
            ? await mockProvider.analyzeImage({ task: resolvedTask, intent, question, context })
            : await mockProvider.generateText({ task: resolvedTask, intent, question, context });
      } catch {
        if (intent === "freeform") {
          return { status: "error", error: "AI could not answer this question right now." };
        }
        response = buildLocalCultureFallback(context, intent, resolvedTask);
      }
    }

    return {
      status: "success",
      response: {
        ...response,
      },
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "AI Local Companion failed.",
    };
  }
}
