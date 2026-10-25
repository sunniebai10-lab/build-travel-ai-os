import type { AIImageRequest, AIProvider, AITextRequest } from "@/lib/ai/types";

export const glmProvider: AIProvider = {
  name: "glm",
  async generateText(_request: AITextRequest) {
    throw new Error("GLM-5.2 is reserved for vision and memory tasks in this architecture.");
  },
  async analyzeImage(_request: AIImageRequest) {
    throw new Error("GLM provider is not enabled. Configure GLM_API_KEY and replace mock routing when ready.");
  },
};
