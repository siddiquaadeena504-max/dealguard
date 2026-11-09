"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, CircleDashed, Trash2 } from "lucide-react";
import { deleteWorkspaceAction, saveSettingsAction } from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, fieldClassName } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

const TONES = [
  { key: "gentle", label: "Gentle", sample: "“Just a friendly nudge whenever you get a moment 🙂”" },
  { key: "balanced", label: "Balanced", sample: "“Could you confirm when payment will be made?”" },
  { key: "direct", label: "Direct", sample: "“Payment is 9 days overdue. Please pay by Friday.”" },
] as const;

type Ws = { name: string; niche: string; payoutEmail: string; currency: string; reminderTone: "gentle" | "balanced" | "direct"; isDemo: boolean };

export function SettingsForm({ ws, live }: { ws: Ws; live: { paypal: boolean; groq: boolean; gemini: boolean } }) {
  const router = useRouter();
  const [form, setForm] = useState(ws);
  const [saving, start] = useTransition();
  const dirty = JSON.stringify(form) !== JSON.stringify(ws);

  function save() {
    start(async () => {
      const res = await saveSettingsAction(form);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Saved. Your agent will use these from now on.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-caption font-medium text-emerald-ink">Settings</p>
        <h1 className="mt-1 font-heading text-[1.75rem] leading-tight font-extrabold tracking-[-0.03em] sm:text-h1">Make it yours</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader><div><CardTitle>Profile</CardTitle><CardDescription>Shown on every invoice you send.</CardDescription></div></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="name">Your name</Label><Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="niche">Niche</Label><Input id="niche" value={form.niche} placeholder="e.g. Beauty & lifestyle" onChange={(e) => setForm({ ...form, niche: e.target.value })} /></div>
              <div className="space-y-1.5">
                <Label htmlFor="payout">PayPal payout email (sandbox)</Label>
                <Input id="payout" type="email" value={form.payoutEmail} placeholder="you@example.com" onChange={(e) => setForm({ ...form, payoutEmail: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cur">Dashboard currency</Label>
                <select id="cur" className={cn(fieldClassName, "h-11")} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                  {["INR", "USD", "EUR", "GBP"].map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><div><CardTitle>Reminder tone</CardTitle><CardDescription>How your chase agent sounds when a brand pays late.</CardDescription></div></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Reminder tone">
              {TONES.map((t) => {
                const on = form.reminderTone === t.key;
                return (
                  <button
                    key={t.key}
                    role="radio"
                    aria-checked={on}
                    onClick={() => setForm({ ...form, reminderTone: t.key })}
                    className={cn("relative rounded-2xl p-4 text-left ring-1 transition-all", on ? "bg-emerald-soft ring-emerald/40" : "bg-surface-sunken ring-transparent hover:ring-line")}
                  >
                    {on && <motion.span layoutId="tone-check" className="absolute top-3 right-3 text-emerald-ink"><CheckCircle2 className="size-4" /></motion.span>}
                    <p className="font-semibold">{t.label}</p>
                    <p className="mt-1 text-caption text-muted-foreground">{t.sample}</p>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button size="lg" onClick={save} loading={saving} disabled={!dirty}>Save changes</Button>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
            <CardContent><ThemeToggle className="flex w-full [&_button]:flex-1 [&_button]:justify-center" /></CardContent>
          </Card>
          <Card>
            <CardHeader><div><CardTitle>Connections</CardTitle><CardDescription>Keys live in the server&apos;s .env file, never in the browser.</CardDescription></div></CardHeader>
            <CardContent className="space-y-2">
              {[
                ["PayPal sandbox", live.paypal, "Invoices, reminders and payouts are simulated"],
                ["Groq (primary AI)", live.groq, "Using the built-in reader"],
                ["Gemini (fallback AI)", live.gemini, "Not configured"],
              ].map(([label, on, off]) => (
                <div key={label as string} className="flex items-center gap-3 rounded-xl bg-surface-sunken px-3 py-2.5">
                  {on ? <CheckCircle2 className="size-4 text-emerald-ink" aria-hidden /> : <CircleDashed className="size-4 text-amber-ink" aria-hidden />}
                  <div>
                    <p className="text-[0.875rem] font-semibold">{label as string}</p>
                    <p className="text-caption text-muted-foreground">{on ? "Connected" : (off as string)}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="ring-coral/20">
            <CardHeader><div><CardTitle>{ws.isDemo ? "Leave demo" : "Delete account"}</CardTitle><CardDescription>Removes this workspace and every deal in it.</CardDescription></div></CardHeader>
            <CardContent>
              <form action={deleteWorkspaceAction} onSubmit={(e) => { if (!confirm("Delete this workspace and all its deals? This can't be undone.")) e.preventDefault(); }}>
                <Button variant="danger" type="submit" className="w-full"><Trash2 /> {ws.isDemo ? "End demo session" : "Delete everything"}</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
