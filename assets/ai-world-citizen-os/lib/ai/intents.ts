export type AIIntent = "understand" | "observe" | "respect" | "experience" | "capture" | "freeform";

export interface AIIntentDefinition {
  intent: AIIntent;
  label: string;
  shortLabel: string;
  question: string;
  outputs: string[];
  primaryTask: "culture" | "history" | "trip_advice" | "local_tips" | "image_analysis" | "image_memory";
}

export const aiIntentDefinitions: Record<AIIntent, AIIntentDefinition> = {
  understand: {
    intent: "understand",
    label: "了解历史",
    shortLabel: "Understand",
    question: "为什么这里重要？",
    outputs: ["Why Important", "History", "Meaning"],
    primaryTask: "history",
  },
  observe: {
    intent: "observe",
    label: "看哪些细节",
    shortLabel: "Observe",
    question: "我应该看什么？",
    outputs: ["Architecture", "Detail", "Symbol", "Hidden Story"],
    primaryTask: "culture",
  },
  respect: {
    intent: "respect",
    label: "当地礼仪",
    shortLabel: "Respect",
    question: "有什么需要注意？",
    outputs: ["Taboo", "Local Rules", "Etiquette"],
    primaryTask: "local_tips",
  },
  experience: {
    intent: "experience",
    label: "当地体验",
    shortLabel: "Experience",
    question: "这里有什么值得体验？",
    outputs: ["Food", "Local Life", "Neighborhood"],
    primaryTask: "trip_advice",
  },
  capture: {
    intent: "capture",
    label: "拍摄建议",
    shortLabel: "Capture",
    question: "哪里适合拍照？",
    outputs: ["Best View", "Time", "Photo Story"],
    primaryTask: "image_memory",
  },
  freeform: {
    intent: "freeform",
    label: "自由提问",
    shortLabel: "Ask",
    question: "请直接回答我的现场问题。",
    outputs: ["Direct Answer", "Context", "Next Step"],
    primaryTask: "trip_advice",
  },
};

export const suggestedIntentQuestions = [
  { intent: "understand" as const, icon: "🏛", label: "了解历史" },
  { intent: "observe" as const, icon: "👀", label: "看哪些细节" },
  { intent: "respect" as const, icon: "🙏", label: "当地礼仪" },
  { intent: "experience" as const, icon: "🍜", label: "当地体验" },
  { intent: "capture" as const, icon: "📷", label: "拍摄建议" },
];

export function getTaskForIntent(intent: AIIntent) {
  return aiIntentDefinitions[intent].primaryTask;
}
