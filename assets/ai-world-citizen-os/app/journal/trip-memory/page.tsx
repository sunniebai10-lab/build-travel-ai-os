import { TripMemoryMaker } from "@/components/trip-memory-maker";
import { DetailPageShell } from "@/components/interaction-detail-cards";
import { BottomNavigation } from "@/components/travel-components";

export default function TripMemoryPage() {
  return (
    <>
      <DetailPageShell title="旅行回顾" eyebrow="Trip Memory" backHref="/journal">
        <TripMemoryMaker />
      </DetailPageShell>
      <div className="md:hidden">
        <BottomNavigation activeTab="/journal" />
      </div>
    </>
  );
}
