import type { TripMemoryContext, TripMemoryResponse } from "@/lib/ai/types";

type DeepSeekChatCompletion = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

export const tripMemorySystemPrompt = `
你是一名 AI World Citizen Trip Memory Maker。

你的任务是帮助旅行者把一次旅程保存成一份个人旅行档案。
这不是旅游攻略、行程复盘或景点清单。
你要回答的是：这段旅程里，旅行者看到了什么、理解了什么、留下些什么。

写作规则：
- 默认使用简体中文。
- 温暖、克制、有文化理解。
- 只使用给定的手帐、完成活动、行程与用户主动请求过的 AI 洞察。
- 不要虚构用户没有经历过的事情，不要推断敏感个人信息。
- 不要将消费金额、照片内容或私人信息作为结论。
- 不使用营销词、百科口吻或 markdown。
- 必须返回 JSON object，且不输出 JSON 以外的内容。
`;

function extractJsonObject(content: string) {
  const trimmed = content.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  return firstBrace >= 0 && lastBrace > firstBrace ? trimmed.slice(firstBrace, lastBrace + 1) : "";
}

function limitText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  const chars = Array.from(value.replace(/\s+/g, " ").trim());
  return chars.length > maxLength ? `${chars.slice(0, maxLength - 1).join("")}…` : chars.join("");
}

function normalizeList(value: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => limitText(item, maxLength)).filter(Boolean).slice(0, maxItems);
}

function buildFallbackTripMemory(context: TripMemoryContext): TripMemoryResponse {
  const hasPersonalRecords = context.journals.length > 0 || context.completedActivities.length > 0;
  const places = [...new Set([
    ...context.journals.map((journal) => journal.city),
    ...context.completedActivities.map((activity) => activity.city),
  ].filter(Boolean))].slice(0, 6);
  const highlights = context.journals.map((journal) => journal.sentence).filter(Boolean).slice(0, 4);
  const cultural = context.aiInsights
    .map((insight) => insight.whyImportant || insight.cultureTips || insight.summary)
    .filter(Boolean)
    .slice(0, 3);
  const moments = context.completedActivities.map((activity) => `${activity.city} · ${activity.title}`).slice(0, 4);
  const interests = context.userContext.interests.length ? context.userContext.interests.join("、") : "历史、建筑与当地生活";

  return {
    mode: hasPersonalRecords ? "travel_recap" : "planning_draft",
    title: hasPersonalRecords ? `${context.trip.name} · 旅行回顾` : `${context.trip.name} · 记忆草案`,
    tripOverview: hasPersonalRecords
      ? `这趟从${context.trip.startDate}到${context.trip.endDate}的旅程，沿着${context.trip.cities.slice(0, 5).join("、")}慢慢展开。它更像一次围绕${interests}的观察，而不只是抵达。`
      : `这是一份从${context.trip.startDate}到${context.trip.endDate}的旅行规划记忆草案。它沿着${context.trip.cities.slice(0, 5).join("、")}展开，准备为${interests}留出真实观察的空间。`,
    importantPlaces: places.length ? places : context.trip.cities.slice(0, 5),
    personalHighlights: highlights.length ? highlights : ["这段旅程尚未留下个人记录，第一条手帐会成为回忆开始的地方。"],
    culturalInsights: cultural.length ? cultural : ["每一次停留，都让地方从地图上的名字变成了可被理解的现场。"],
    favoriteMoments: moments.length ? moments : context.itinerary.slice(0, 3).map((item) => `准备在${item.city}的${item.title}留下自己的观察。`),
    travelStyle: `这次旅程呈现出${context.userContext.travelStyle || "文化探索"}的节奏：留意${interests}，并为现场观察保留时间。`,
    provider: "mock",
    source: "mock",
  };
}

export function buildTripMemoryPrompt(context: TripMemoryContext) {
  const mode = context.journals.length || context.completedActivities.length ? "travel_recap" : "planning_draft";
  return `
${tripMemorySystemPrompt}

Trip Memory Context:
${JSON.stringify(context, null, 2)}

Memory Mode: ${mode}

Return JSON with exactly this schema:
{
  "title": "不超过20个中文字符，有记忆感的旅行标题",
  "tripOverview": "不超过150个中文字符，写这趟旅程的整体意义",
  "importantPlaces": ["地点 1", "地点 2"],
  "personalHighlights": ["来自用户手帐的真实瞬间"],
  "culturalInsights": ["用户主动理解过的文化线索"],
  "favoriteMoments": ["完成活动或手帐中的值得记住时刻"],
  "travelStyle": "不超过100个中文字符，只总结已知的旅行方式与兴趣"
}

Hard rules:
- 每个数组 2 到 4 项；没有足够资料时宁可简洁，不要编造。
- personalHighlights 必须来自 journals.sentence 或 journals.story。
- culturalInsights 必须来自 aiInsights 或 itinerary.aiNote。
- favoriteMoments 必须来自 completedActivities 或 journals。
- 不要包含消费、私人身份推断或未经用户确认的情绪判断。
- 不要输出 markdown、编号或 JSON 外文字。
- 当 mode 是 travel_recap：可以总结用户明确写下或完成的经历。
- 当 mode 是 planning_draft：这是旅行尚未开始时的规划记忆草案。不得写用户已经去过、看过、感受过任何地点；personalHighlights 必须说明等待用户记录的真实瞬间，favoriteMoments 必须使用“准备/期待/留给自己”的未来表达。
`;
}

function normalizeTripMemory(context: TripMemoryContext, content: string): TripMemoryResponse {
  const jsonText = extractJsonObject(content);
  if (!jsonText) return buildFallbackTripMemory(context);

  try {
    const parsed = JSON.parse(jsonText) as Partial<TripMemoryResponse>;
    const fallback = buildFallbackTripMemory(context);
    return {
      mode: context.journals.length || context.completedActivities.length ? "travel_recap" : "planning_draft",
      title: limitText(parsed.title, 20) || fallback.title,
      tripOverview: limitText(parsed.tripOverview, 160) || fallback.tripOverview,
      importantPlaces: normalizeList(parsed.importantPlaces, 4, 36).length ? normalizeList(parsed.importantPlaces, 4, 36) : fallback.importantPlaces,
      personalHighlights: normalizeList(parsed.personalHighlights, 4, 100).length ? normalizeList(parsed.personalHighlights, 4, 100) : fallback.personalHighlights,
      culturalInsights: normalizeList(parsed.culturalInsights, 4, 100).length ? normalizeList(parsed.culturalInsights, 4, 100) : fallback.culturalInsights,
      favoriteMoments: normalizeList(parsed.favoriteMoments, 4, 90).length ? normalizeList(parsed.favoriteMoments, 4, 90) : fallback.favoriteMoments,
      travelStyle: limitText(parsed.travelStyle, 110) || fallback.travelStyle,
      provider: "deepseek",
      source: "provider",
    };
  } catch {
    return buildFallbackTripMemory(context);
  }
}

export function formatTripMemoryStory(memory: TripMemoryResponse) {
  return [
    memory.title,
    "",
    "Trip Overview",
    memory.tripOverview,
    "",
    "Important Places",
    ...memory.importantPlaces.map((place) => `- ${place}`),
    "",
    "Personal Highlights",
    ...memory.personalHighlights.map((item) => `- ${item}`),
    "",
    "Cultural Insights",
    ...memory.culturalInsights.map((item) => `- ${item}`),
    "",
    "Favorite Moments",
    ...memory.favoriteMoments.map((item) => `- ${item}`),
    "",
    "Travel Style",
    memory.travelStyle,
  ].join("\n");
}

export async function generateTripMemory(context: TripMemoryContext): Promise<TripMemoryResponse> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return buildFallbackTripMemory(context);

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
          { role: "system", content: tripMemorySystemPrompt },
          { role: "user", content: buildTripMemoryPrompt(context) },
        ],
        response_format: { type: "json_object" },
        stream: false,
        temperature: 0.45,
        max_tokens: 900,
      }),
    });

    if (!response.ok) return buildFallbackTripMemory(context);

    const completion = (await response.json()) as DeepSeekChatCompletion;
    const content = completion.choices?.[0]?.message?.content;
    return content ? normalizeTripMemory(context, content) : buildFallbackTripMemory(context);
  } catch {
    return buildFallbackTripMemory(context);
  }
}
