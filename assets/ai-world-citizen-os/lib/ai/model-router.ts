import type { AIProviderName, AITask, RouteAIRequestInput } from "@/lib/ai/types";

const textReasoningTasks: AITask[] = ["culture", "history", "trip_advice", "local_tips"];
const visionTasks: AITask[] = ["image_analysis", "image_memory", "memory_generation", "place_recognition"];

export function routeAIRequest(input: RouteAIRequestInput): AIProviderName {
  if (visionTasks.includes(input.task)) {
    return "glm";
  }

  if (textReasoningTasks.includes(input.task)) {
    return "deepseek";
  }

  return "deepseek";
}

export function getModelFamily(provider: AIProviderName) {
  if (provider === "glm") {
    return "GLM-5.2";
  }

  if (provider === "deepseek") {
    return "DeepSeek";
  }

  return "Mock Provider";
}
