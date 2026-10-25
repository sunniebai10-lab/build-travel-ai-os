import type { UserTravelContext } from "@/lib/ai/types";
import travelConfig from "@/travel.config.json";

export const defaultTravelProfile: UserTravelContext = {
  name: travelConfig.travelerName,
  travelStyle: "cultural exploration",
  interests: ["history", "architecture", "local culture", "photography"],
  language: "Chinese",
  contentPreference: "deep explanation",
};

export function getDefaultUserContext(): UserTravelContext {
  return defaultTravelProfile;
}
