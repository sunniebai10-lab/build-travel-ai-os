import { buildLocalCompanionPrompt, localCompanionSystemPrompt } from "@/lib/ai/prompts";
import type { AIImageRequest, AIProvider, AITextRequest, AITextResponse } from "@/lib/ai/types";

type DeepSeekChatCompletion = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

function extractJsonObject(content: string) {
  const trimmed = content.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return "";
}

function limitText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  const normalized = value.replace(/\s+/g, " ").trim();
  const chars = Array.from(normalized);
  return chars.length > maxLength ? `${chars.slice(0, maxLength - 1).join("")}…` : normalized;
}

function firstMeaningful(...values: unknown[]) {
  for (const value of values) {
    const text = limitText(value, 72);
    if (text) return text;
  }
  return "";
}

function normalizeProviderResponse(request: AITextRequest, content: string): AITextResponse {
  const jsonText = extractJsonObject(content);

  if (jsonText) {
    try {
      const parsed = JSON.parse(jsonText) as Partial<AITextResponse>;
      const sections = Array.isArray(parsed.sections)
        ? parsed.sections
            .filter((section) => section && typeof section.title === "string" && typeof section.content === "string")
            .slice(0, 3)
            .map((section) => ({
              title: limitText(section.title, 8),
              content: limitText(section.content, 68),
            }))
        : [];
      const tips = Array.isArray(parsed.tips) ? parsed.tips.map((tip) => limitText(tip, 18)).filter(Boolean).slice(0, 2) : [];
      const summary = limitText(parsed.summary, 46);
      const whyImportant = firstMeaningful(parsed.whyImportant, summary, sections[0]?.content);
      const history = firstMeaningful(parsed.history, sections.find((section) => section.title.includes("历史"))?.content, sections[0]?.content, summary);
      const observe = firstMeaningful(parsed.observe, parsed.observationGuide, sections.find((section) => section.title.includes("观察"))?.content, sections[1]?.content, summary);
      const cultureTips = firstMeaningful(parsed.cultureTips, sections.find((section) => section.title.includes("文化"))?.content, sections[2]?.content, tips[0], summary);
      const localAdvice = firstMeaningful(parsed.localAdvice, tips.join(" / "), cultureTips, summary);

      return {
        intent: request.intent,
        title: limitText(parsed.title, 16) || "现场理解",
        summary: summary || whyImportant,
        sections: [
          { title: "为什么重要", content: whyImportant },
          { title: "历史背景", content: history },
          { title: "观察什么", content: observe },
        ].filter((section) => section.content),
        tips,
        whyImportant,
        history,
        observe,
        cultureTips,
        observationGuide: observe,
        localAdvice,
        provider: "deepseek",
        task: request.task,
        source: "provider",
      };
    } catch {
      // Fall through to the readable text fallback.
    }
  }

  const summary = limitText(content, 90);

  return {
    intent: request.intent,
    title: "现场理解",
    summary,
    sections: [{ title: "理解这里", content: summary }],
    tips: [],
    whyImportant: summary,
    history: "",
    observe: summary,
    cultureTips: "",
    observationGuide: "",
    localAdvice: "",
    provider: "deepseek",
    task: request.task,
    source: "provider",
  };
}

export const deepSeekProvider: AIProvider = {
  name: "deepseek",
  async generateText(request: AITextRequest) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error("DeepSeek provider is not enabled. Configure DEEPSEEK_API_KEY.");
    }

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash",
        thinking: { type: "disabled" },
        messages: [
          { role: "system", content: localCompanionSystemPrompt },
          { role: "user", content: buildLocalCompanionPrompt(request.context, request.question) },
        ],
        response_format: { type: "json_object" },
        stream: false,
        temperature: 0.4,
        max_tokens: 620,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek request failed: ${response.status}`);
    }

    const completion = (await response.json()) as DeepSeekChatCompletion;
    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("DeepSeek response was empty.");
    }

    return normalizeProviderResponse(request, content);
  },
  async analyzeImage(_request: AIImageRequest) {
    throw new Error("DeepSeek is reserved for text reasoning in this architecture.");
  },
};
