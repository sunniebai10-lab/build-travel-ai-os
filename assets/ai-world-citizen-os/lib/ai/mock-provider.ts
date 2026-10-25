import type { AIImageRequest, AIProvider, AITextRequest, AITextResponse } from "@/lib/ai/types";

function mockResponse(request: AITextRequest | AIImageRequest): AITextResponse {
  const message = "这是未接入真实 AI 服务的演示状态。请配置服务后重新提问；目的地事实需自行核验。";
  return {
    intent: request.intent ?? "understand",
    title: "AI 服务尚未配置",
    summary: message,
    sections: [{ title: "当前状态", content: message }],
    tips: ["你仍可以查看行程、记录日记与费用。"],
    whyImportant: message,
    history: message,
    observe: message,
    cultureTips: message,
    observationGuide: message,
    localAdvice: message,
    provider: "mock",
    task: request.task,
    source: "mock",
  };
}

export const mockProvider: AIProvider = {
  name: "mock",
  async generateText(request) { return mockResponse(request); },
  async analyzeImage(request) { return mockResponse(request); },
};

export function getMockCompanionDemo() {
  return { status: "unconfigured", message: "AI 服务尚未配置" };
}
