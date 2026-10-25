import { AIPlannerForm } from "@/components/ai-planner";
import { DetailPageShell } from "@/components/interaction-detail-cards";
import { BottomNavigation } from "@/components/travel-components";

export default function PlannerPage() {
  return (
    <>
      <DetailPageShell title="规划一次旅行" eyebrow="AI Planner" backHref="/ai">
        <AIPlannerForm />
      </DetailPageShell>
      <div className="md:hidden">
        <BottomNavigation activeTab="/ai" />
      </div>
    </>
  );
}
