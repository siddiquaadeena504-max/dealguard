"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ClipboardPaste, Inbox, Wallet } from "lucide-react";
import { startWorkspaceAction } from "@/app/app/actions";
import { Logo } from "@/components/brand/logo";
import { Aurora } from "@/components/motion/primitives";
import { Button } from "@/components/ui/button";
import { Input, fieldClassName } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

const NICHES = ["Beauty", "Tech", "Fitness", "Food", "Travel", "Gaming", "Finance", "Fashion", "Lifestyle"];
const STEPS = ["About you", "Get paid", "First deal"];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [form, setForm] = useState({ name: "", niche: "", payoutEmail: "", currency: "INR" });
  const [busy, start] = useTransition();

  const go = (n: number) => { setDir(n > step ? 1 : -1); setStep(n); };

  function finish(dest: "/app/new" | "/app") {
    start(async () => {
      const res = await startWorkspaceAction(form);
      if (!res.ok) return void toast.error(res.error);
      router.push(dest);
    });
  }

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
      <Aurora />
      <div className="relative w-full max-w-lg">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/"><Logo animate /></Link>
          <button onClick={() => finish("/app")} className="text-caption font-medium text-muted-foreground hover:text-foreground" disabled={busy}>
            Skip for now
          </button>
        </div>

        {/* progress */}
        <div className="mb-6">
          <div className="flex justify-between text-caption font-medium">
            {STEPS.map((s, i) => (
              <span key={s} className={cn(i <= step ? "text-foreground" : "text-muted-foreground")}>{i + 1}. {s}</span>
            ))}
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-sunken" role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step + 1}>
            <motion.div className="h-full rounded-full bg-emerald" animate={{ width: `${((step + 1) / 3) * 100}%` }} transition={{ type: "spring", stiffness: 200, damping: 28 }} />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl bg-surface/90 p-6 shadow-soft-lg ring-1 ring-line backdrop-blur-xl sm:p-8">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              initial={{ opacity: 0, x: dir * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -40 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              {step === 0 && (
                <div className="space-y-5">
                  <div>
                    <h1 className="font-heading text-h2 font-extrabold tracking-[-0.02em]">Hi! What should we call you?</h1>
                    <p className="mt-1 text-muted-foreground">This goes on your invoices.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="n">Your name</Label>
                    <Input id="n" autoFocus value={form.name} placeholder="Aanya Kapoor" onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Your niche</Label>
                    <div className="flex flex-wrap gap-2">
                      {NICHES.map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setForm({ ...form, niche: n })}
                          aria-pressed={form.niche === n}
                          className={cn("rounded-full px-3.5 py-1.5 text-caption font-medium ring-1 transition-all", form.niche === n ? "bg-emerald text-ink ring-emerald" : "bg-surface-sunken ring-line hover:ring-foreground/20")}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button size="lg" className="w-full" onClick={() => go(1)} disabled={!form.name.trim()}>Continue <ArrowRight /></Button>
                </div>
              )}
              {step === 1 && (
                <div className="space-y-5">
                  <span className="grid size-12 place-items-center rounded-2xl bg-emerald-soft text-emerald-ink"><Wallet className="size-6" /></span>
                  <div>
                    <h1 className="font-heading text-h2 font-extrabold tracking-[-0.02em]">Where should brands pay you?</h1>
                    <p className="mt-1 text-muted-foreground">Use your PayPal sandbox account. No real money moves in this beta.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pe">PayPal email (sandbox)</Label>
                    <Input id="pe" type="email" value={form.payoutEmail} placeholder="you@business.example.com" onChange={(e) => setForm({ ...form, payoutEmail: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="c">Main currency</Label>
                    <select id="c" className={cn(fieldClassName, "h-11")} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                      <option value="INR">₹ Indian rupee</option>
                      <option value="USD">$ US dollar</option>
                      <option value="EUR">€ Euro</option>
                      <option value="GBP">£ Pound</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="lg" onClick={() => go(0)}><ArrowLeft /> Back</Button>
                    <Button size="lg" className="flex-1" onClick={() => go(2)}>Continue <ArrowRight /></Button>
                  </div>
                </div>
              )}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <h1 className="font-heading text-h2 font-extrabold tracking-[-0.02em]">Add your first deal</h1>
                    <p className="mt-1 text-muted-foreground">Paste a brand email, or try one from the demo inbox.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { icon: ClipboardPaste, title: "Paste an email", body: "From any brand, any format." },
                      { icon: Inbox, title: "Use a demo email", body: "5 realistic brand offers." },
                    ].map(({ icon: Icon, title, body }) => (
                      <button key={title} onClick={() => finish("/app/new")} disabled={busy} className="group rounded-2xl bg-surface-sunken p-4 text-left ring-1 ring-transparent transition-all hover:-translate-y-0.5 hover:ring-emerald/40">
                        <Icon className="size-5 text-emerald-ink" />
                        <p className="mt-3 font-semibold">{title}</p>
                        <p className="text-caption text-muted-foreground">{body}</p>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="lg" onClick={() => go(1)}><ArrowLeft /> Back</Button>
                    <Button variant="secondary" size="lg" className="flex-1" onClick={() => finish("/app")} loading={busy}>Go to dashboard</Button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
