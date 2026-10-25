import { AIMemoryMaker } from "@/components/ai-memory-maker";
import { DetailPageShell } from "@/components/interaction-detail-cards";
import { BottomNavigation } from "@/components/travel-components";
import travelConfig from "@/travel.config.json";

export default async function NewAIMemoryPage({
  searchParams,
}: {
  searchParams?: Promise<{
    journalId?: string;
    city?: string;
    country?: string;
    date?: string;
    sentence?: string;
    photos?: string;
    activityTitle?: string;
    category?: string;
    completed?: string;
    whyImportant?: string;
    history?: string;
    observe?: string;
    cultureTips?: string;
  }>;
}) {
  const params = (await searchParams) ?? {};

  return (
    <>
      <DetailPageShell title="AI整理记忆" eyebrow="Memory Maker" backHref="/journal">
        <AIMemoryMaker
          journalId={params.journalId}
          city={params.city ?? travelConfig.cities[0]?.name ?? "未设置目的地"}
          country={params.country}
          date={params.date ?? new Date().toISOString().slice(0, 10)}
          sentence={params.sentence ?? "今天我想把这一刻留下来。"}
          photos={params.photos}
          activityTitle={params.activityTitle}
          category={params.category}
          completed={params.completed}
          whyImportant={params.whyImportant}
          history={params.history}
          observe={params.observe}
          cultureTips={params.cultureTips}
        />
      </DetailPageShell>
      <div className="md:hidden">
        <BottomNavigation activeTab="/journal" />
      </div>
    </>
  );
}
