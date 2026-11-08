import { requireUser } from "@/lib/auth";
import { get } from "@/lib/db";
import { Sidebar } from "@/components/sidebar";
import { signOut } from "../login/actions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const { n } = get<{ n: number }>(
    "SELECT count(*) AS n FROM extractions WHERE user_id = ? AND status = 'pending'",
    user.id
  )!;

  return (
    <div className="min-h-dvh md:flex">
      <Sidebar pending={n} userLabel={user.name || user.email} signOut={signOut} />
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
