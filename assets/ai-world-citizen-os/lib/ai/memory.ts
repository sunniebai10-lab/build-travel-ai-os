import type { AIMemoryContext, AIMemoryResponse } from "@/lib/ai/types";

type DeepSeekChatCompletion = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

export const aiMemorySystemPrompt = `
你是一名 AI Memory Maker。

你的任务不是写旅游攻略，也不是做旅行总结。
你的任务是帮助旅行者保存人与世界相遇的瞬间。

你要回答：
我为什么记得这一次旅行？

写作要求：
- 默认使用简体中文。
- 温暖、有故事感、有文化理解。
- 不要百科化，不要堆景点知识。
- 不要夸张煽情，不要营销口吻。
- 必须结合用户的一句话、地点、活动和 AI Insight。
- 像个人旅行档案，不像游记模板。

必须返回 JSON object。
必须包含 title, date, place, memory, insight, emotion, reflection。
不要输出 JSON 以外的任何文字。
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

export function buildAIMemoryPrompt(context: AIMemoryContext) {
  return `
${aiMemorySystemPrompt}

Memory Context:
${JSON.stringify(context, null, 2)}

Return JSON with exactly this schema:
{
  "title": "一句有记忆感的标题，不超过18个中文字符",
  "date": "${context.journal.date}",
  "place": "${context.trip.city}",
  "memory": "描述当天经历。不超过90个中文字符",
  "insight": "结合 AI Companion，说明这个地方为什么值得记住。不超过90个中文字符",
  "emotion": "用户自己的感受。不超过70个中文字符",
  "reflection": "旅行带来的思考。不超过90个中文字符"
}

Hard rules:
- memory 必须从用户的一句话出发。
- insight 必须结合 aiInsight，不要凭空写百科。
- emotion 要像用户自己的感受，不要替用户过度抒情。
- reflection 要回答这段经历为什么会留在记忆里。
- 不要使用 markdown。
- 不要输出项目符号。
`;
}

function buildFallbackMemory(context: AIMemoryContext): AIMemoryResponse {
  const place = context.activity?.title || context.trip.city;
  const sentence = context.journal.sentence || `今天在${place}停留了一会儿。`;
  const insight = context.aiInsight?.whyImportant || context.aiInsight?.observe || `${place} 是这段旅程中值得被记住的一站。`;

  return {
    title: "我把这里记住了",
    date: context.journal.date,
    place,
    memory: sentence,
    insight,
    emotion: "这一刻让我感觉，旅行不只是抵达，也是慢慢理解。",
    reflection: "当一个地方和自己的感受连接起来，它就不再只是地图上的名字。",
    provider: "mock",
    source: "mock",
  };
}

function normalizeMemoryResponse(context: AIMemoryContext, content: string): AIMemoryResponse {
  const jsonText = extractJsonObject(content);
  if (!jsonText) return buildFallbackMemory(context);

  try {
    const parsed = JSON.parse(jsonText) as Partial<AIMemoryResponse>;
    const fallback = buildFallbackMemory(context);

    return {
      title: limitText(parsed.title, 18) || fallback.title,
      date: limitText(parsed.date, 16) || context.journal.date,
      place: limitText(parsed.place, 28) || fallback.place,
      memory: limitText(parsed.memory, 96) || fallback.memory,
      insight: limitText(parsed.insight, 96) || fallback.insight,
      emotion: limitText(parsed.emotion, 76) || fallback.emotion,
      reflection: limitText(parsed.reflection, 96) || fallback.reflection,
      provider: "deepseek",
      source: "provider",
    };
  } catch {
    return buildFallbackMemory(context);
  }
}

export function formatAIMemoryStory(memory: AIMemoryResponse) {
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

export async function generateAIMemory(context: AIMemoryContext): Promise<AIMemoryResponse> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return buildFallbackMemory(context);
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
          { role: "system", content: aiMemorySystemPrompt },
          { role: "user", content: buildAIMemoryPrompt(context) },
        ],
        response_format: { type: "json_object" },
        stream: false,
        temperature: 0.5,
        max_tokens: 560,
      }),
    });

    if (!response.ok) {
      return buildFallbackMemory(context);
    }

    const completion = (await response.json()) as DeepSeekChatCompletion;
    const content = completion.choices?.[0]?.message?.content;
    return content ? normalizeMemoryResponse(context, content) : buildFallbackMemory(context);
  } catch {
    return buildFallbackMemory(context);
  }
}
