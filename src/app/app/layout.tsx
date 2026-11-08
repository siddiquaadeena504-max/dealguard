import { BottomNav, DemoBanner, MobileTopBar, Sidebar } from "@/components/app/shell";
import { integrationStatus, requireWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ws = await requireWorkspace();
  const live = integrationStatus();
  return (
    <div className="min-h-dvh">
      {ws.isDemo && <DemoBanner simulated={!live.paypal} />}
      <div className="flex">
        <Sidebar name={ws.name} niche={ws.niche} />
        <div className="min-w-0 flex-1">
          <MobileTopBar />
          <main className="mx-auto max-w-7xl px-4 pt-6 pb-28 sm:px-6 md:px-10 md:pt-10 md:pb-12">{children}</main>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
