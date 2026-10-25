import { DetailPageShell } from "@/components/interaction-detail-cards";
import { AuthSyncStatus } from "@/components/auth-sync-status";
import { JournalPanel } from "@/components/mobile-travel-os";
import { BottomNavigation } from "@/components/travel-components";

export default function JournalPage() {
  return (
    <>
      <DetailPageShell title="我的旅行手帐" eyebrow="Journal" backHref="/#mobile-today">
        <div className="space-y-4">
          <section className="rounded-[var(--radius-large)] bg-white/90 p-5 shadow-[var(--shadow-soft-card)]">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-orange">Memory Archive</div>
            <h1 className="mt-2 font-serif text-[34px] font-bold leading-none text-text-primary">把理解留下来</h1>
            <p className="mt-3 text-sm leading-[1.7] text-text-secondary">
              照片、一句话和 AI 帮你整理的现场理解，会慢慢成为这趟旅程的个人地图。
            </p>
          </section>
          <AuthSyncStatus />
          <JournalPanel />
        </div>
      </DetailPageShell>
      <div className="md:hidden">
        <BottomNavigation activeTab="/journal" />
      </div>
    </>
  );
}
