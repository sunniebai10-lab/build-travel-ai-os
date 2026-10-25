import { BrainCircuit, Camera, Route } from "lucide-react";
import { AIHubEntry, DetailPageShell } from "@/components/interaction-detail-cards";
import { BottomNavigation } from "@/components/travel-components";

export default function AIHubPage() {
  return (
    <>
      <DetailPageShell title="你的世界探索助手" eyebrow="AI伙伴" backHref="/#mobile-today">
        <div className="space-y-4">
          <section className="rounded-[var(--radius-large)] bg-white/90 p-5 shadow-[var(--shadow-soft-card)]">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-orange">AI Hub</div>
            <h1 className="mt-2 font-serif text-[38px] font-bold leading-none">AI伙伴</h1>
            <p className="mt-4 text-sm leading-[1.7] text-text-secondary">
              不是聊天框，而是旅行前、旅行中、旅行后的三个 AI 入口。
            </p>
          </section>

          <AIHubEntry
            icon={Route}
            title="帮我规划一次旅行"
            description="旅行前：输入目的地、时间、预算和兴趣，生成一版路线草案。"
            href="/planner"
          />
          <AIHubEntry
            icon={BrainCircuit}
            title="理解这个地方"
            description="旅行中：结合当前位置、行程和文化背景，解释为什么这里值得被理解。"
            href="/ai/companion"
          />
          <AIHubEntry
            icon={Camera}
            title="整理我的旅行记忆"
            description="旅行后：从照片、一句话和地点中整理成你的旅行故事。"
            href="/journal"
          />
        </div>
      </DetailPageShell>
      <div className="md:hidden">
        <BottomNavigation activeTab="/ai" />
      </div>
    </>
  );
}
