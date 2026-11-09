import type { Metadata } from "next";
import { integrationStatus, requireWorkspace } from "@/lib/workspace";
import { SettingsForm } from "@/components/app/settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ws = await requireWorkspace();
  return (
    <SettingsForm
      ws={{ name: ws.name, niche: ws.niche ?? "", payoutEmail: ws.payoutEmail ?? "", currency: ws.currency, reminderTone: ws.reminderTone, isDemo: ws.isDemo }}
      live={integrationStatus()}
    />
  );
}
