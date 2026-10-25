import type { AIPlannerDay, AIPlannerDraft, AIPlannerInput } from "@/lib/ai/types";

type DeepSeekChatCompletion = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

export const aiPlannerSystemPrompt = `
你是一名 AI World Citizen 旅行规划伙伴。

你的任务不是输出旅游攻略列表，也不是替代 OTA。
你的任务是帮助用户开始一段有意义的世界探索。

规划原则：
- 重点解释为什么这样安排，而不是堆景点。
- 结合文化、历史、用户兴趣和旅行节奏。
- 不做机票、酒店、价格 API 或实时预订建议。
- 不要输出商业化种草，不说“必打卡”“网红”。
- 默认使用简体中文。
- 回答要适合保存成一个 route draft。

必须返回 JSON object。
必须包含 title, theme, route, reasoning, dailyOutline。
dailyOutline 必须是数组，每项包含 day, city, focus, reason。
不要输出 JSON 以外的文字。
`;

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

function parseDurationDays(duration: string) {
  const match = duration.match(/\d+/);
  return match ? Math.max(1, Math.min(21, Number(match[0]))) : 7;
}

function buildFallbackPlannerDraft(input: AIPlannerInput): AIPlannerDraft {
  const days = parseDurationDays(input.duration);
  const destination = input.destination || "你的第一个目的地";
  const interests = input.interests.length ? input.interests.join("、") : "历史、文化和当地生活";
  const outline: AIPlannerDay[] = Array.from({ length: Math.min(days, 7) }, (_, index) => ({
    day: `Day ${index + 1}`,
    city: destination,
    focus: index === 0 ? "抵达与建立第一印象" : "慢慢理解当地生活",
    reason: index === 0 ? "第一天先降低信息密度，让身体和城市节奏对齐。" : `围绕${interests}展开，避免把旅行变成景点清单。`,
  }));

  return {
    title: `${destination}探索草案`,
    theme: `${input.travelStyle || "文化探索"} · ${interests}`,
    route: destination,
    reasoning: "先用轻量路线建立方向，再根据真实时间、预算和体力逐步细化每日安排。",
    dailyOutline: outline,
    provider: "mock",
    source: "mock",
  };
}

export function buildAIPlannerPrompt(input: AIPlannerInput) {
  return `
${aiPlannerSystemPrompt}

Planner Input:
${JSON.stringify(input, null, 2)}

Return JSON with exactly this schema:
{
  "title": "旅程标题，不超过24个中文字符",
  "theme": "这段旅程的核心主题，不超过36个中文字符",
  "route": "城市路线，用箭头连接",
  "reasoning": "为什么这样安排。不超过140个中文字符",
  "dailyOutline": [
    {
      "day": "Day 1",
      "city": "城市",
      "focus": "当天探索重点",
      "reason": "为什么这一天这样安排"
    }
  ]
}

Hard rules:
- dailyOutline 数量应接近用户 duration，但最多输出 10 天。
- 如果 duration 超过 10 天，可以合并相邻天数，例如 Day 4-5。
- route 必须是城市或区域顺序，不要写景点清单。
- reasoning 必须说明文化、历史或旅行节奏逻辑。
- 不要提供航班、酒店、实时价格或预订信息。
- 不要输出 markdown。
`;
}

function normalizePlannerDraft(input: AIPlannerInput, content: string): AIPlannerDraft {
  const jsonText = extractJsonObject(content);
  if (!jsonText) return buildFallbackPlannerDraft(input);

  try {
    const parsed = JSON.parse(jsonText) as Partial<AIPlannerDraft>;
    const fallback = buildFallbackPlannerDraft(input);
    const rawOutline = Array.isArray(parsed.dailyOutline) ? parsed.dailyOutline : [];
    const dailyOutline = rawOutline
      .map((item) => ({
        day: limitText((item as Partial<AIPlannerDay>).day, 14),
        city: limitText((item as Partial<AIPlannerDay>).city, 24),
        focus: limitText((item as Partial<AIPlannerDay>).focus, 42),
        reason: limitText((item as Partial<AIPlannerDay>).reason, 78),
      }))
      .filter((item) => item.day && item.city && item.focus)
      .slice(0, 10);

    return {
      title: limitText(parsed.title, 24) || fallback.title,
      theme: limitText(parsed.theme, 42) || fallback.theme,
      route: limitText(parsed.route, 120) || fallback.route,
      reasoning: limitText(parsed.reasoning, 150) || fallback.reasoning,
      dailyOutline: dailyOutline.length ? dailyOutline : fallback.dailyOutline,
      provider: "deepseek",
      source: "provider",
    };
  } catch {
    return buildFallbackPlannerDraft(input);
  }
}

export async function generateAIPlannerDraft(input: AIPlannerInput): Promise<AIPlannerDraft> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return buildFallbackPlannerDraft(input);
  }

  try {
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
          { role: "system", content: aiPlannerSystemPrompt },
          { role: "user", content: buildAIPlannerPrompt(input) },
        ],
        response_format: { type: "json_object" },
        stream: false,
        temperature: 0.45,
        max_tokens: 900,
      }),
    });

    if (!response.ok) {
      return buildFallbackPlannerDraft(input);
    }

    const completion = (await response.json()) as DeepSeekChatCompletion;
    const content = completion.choices?.[0]?.message?.content;
    return content ? normalizePlannerDraft(input, content) : buildFallbackPlannerDraft(input);
  } catch {
    return buildFallbackPlannerDraft(input);
  }
}
