"use client";

import { Fragment, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight, BellRing, CalendarClock, ClipboardPaste, Eye, FileText, Inbox, Pencil, Plus, Send, ShieldCheck, Sparkles, Trash2, Wand2, X,
} from "lucide-react";
import { approveAndSendAction, discardDraftAction, extractAction } from "@/app/app/actions";
import { ShieldMark } from "@/components/brand/logo";
import { Confetti, ShieldPulse } from "@/components/motion/confetti";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Textarea, fieldClassName } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfidenceHint, Skeleton } from "@/components/ui/misc";
import { toast } from "@/components/ui/toaster";
import type { Extraction } from "@/lib/ai/schema";
import { fmtDate, money } from "@/lib/format";
import { cn } from "@/lib/utils";

type DemoEmail = { id: string; from: string; fromEmail: string; subject: string; preview: string; receivedAgo: string; avatar: string; body: string };
export type DraftPrefill = { id: string; email: string; data: Extraction };
type Phase = "idle" | "extracting" | "ready";

const ease = [0.16, 1, 0.3, 1] as const;
const CURRENCIES = ["INR", "USD", "EUR", "GBP"];
const SOURCE_LABEL: Record<string, string> = { groq: "Groq", openrouter: "OpenRouter", "openai-compatible": "AI model", gemini: "Gemini", "built-in": "Built-in reader" };
const FIELD_COUNT = 9;

/** Highlights the words the AI pulled out, so the creator can see where each value came from. */
function Highlighted({ text, terms }: { text: string; terms: string[] }) {
  const list = terms.filter((t) => t && t.length > 2).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!list.length) return <>{text}</>;
  const re = new RegExp(`(${list.join("|")})`, "gi");
  return (
    <>
      {text.split(re).map((part, i) =>
        i % 2 === 1 ? (
          <motion.mark
            key={i}
            initial={{ backgroundColor: "rgba(18,184,134,0)" }}
            animate={{ backgroundColor: "rgba(18,184,134,0.22)" }}
            transition={{ duration: 0.5 }}
            className="rounded px-0.5 text-foreground"
          >
            {part}
          </motion.mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}

function feeVariants(fee: number | null) {
  if (!fee) return [];
  return [fee.toLocaleString("en-IN"), fee.toLocaleString("en-US"), String(fee)];
}

function Field({
  index, revealed, label, confidence, children, className, htmlFor,
}: { index: number; revealed: number; label: string; confidence?: number; children: React.ReactNode; className?: string; htmlFor?: string }) {
  const show = index < revealed;
  return (
    <div className={cn("relative", className)}>
      <AnimatePresence mode="wait" initial={false}>
        {show ? (
          <motion.div
            key="field"
            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.4, ease }}
            className="space-y-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={htmlFor}>{label}</Label>
              {confidence != null && <ConfidenceHint value={confidence} />}
            </div>
            <motion.div
              initial={{ boxShadow: "0 0 0 3px rgba(18,184,134,0.45)" }}
              animate={{ boxShadow: "0 0 0 0px rgba(18,184,134,0)" }}
              transition={{ duration: 0.9, delay: 0.15 }}
              className="rounded-xl"
            >
              {children}
            </motion.div>
          </motion.div>
        ) : (
          <motion.div key="skel" exit={{ opacity: 0 }} className="space-y-2 pt-0.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function NewDealClient({
  creator, emails, draft, aiLive, paypalLive,
}: {
  creator: { name: string; payoutEmail: string | null };
  emails: DemoEmail[];
  draft: DraftPrefill | null;
  aiLive: boolean;
  paypalLive: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"inbox" | "paste">(draft ? "paste" : "inbox");
  const [selected, setSelected] = useState<DemoEmail | null>(draft ? null : null);
  const [pasted, setPasted] = useState(draft?.email ?? "");
  const [phase, setPhase] = useState<Phase>(draft ? "ready" : "idle");
  const [data, setData] = useState<Extraction | null>(draft?.data ?? null);
  const [source, setSource] = useState<string | null>(draft ? "saved" : null);
  const [revealed, setRevealed] = useState(draft ? 0 : 0);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [sent, setSent] = useState<{ dealId: string; invoiceNumber: string; simulated: boolean; note?: string } | null>(null);
  const [sending, startSend] = useTransition();

  const emailText = tab === "inbox" ? selected?.body ?? "" : pasted;

  // Reveal fields one by one once data arrives.
  useEffect(() => {
    if (phase !== "ready") return;
    if (revealed >= FIELD_COUNT) return;
    const t = setTimeout(() => setRevealed((r) => r + 1), revealed === 0 ? 150 : 230);
    return () => clearTimeout(t);
  }, [phase, revealed]);

  async function extract() {
    if (!emailText.trim()) return toast.error("Pick an email or paste one first.");
    setPhase("extracting");
    setRevealed(0);
    setData(null);
    const started = Date.now();
    const res = await extractAction(emailText, selected && tab === "inbox" ? { fromName: selected.from, fromEmail: selected.fromEmail, subject: selected.subject } : undefined);
    // Let the scanning animation breathe a little, even when the reader is instant.
    await new Promise((r) => setTimeout(r, Math.max(0, 1300 - (Date.now() - started))));
    if (!res.ok) {
      setPhase("idle");
      return toast.error("Couldn't read that email", { description: res.error });
    }
    setData(res.data);
    setSource(res.source);
    setPhase("ready");
  }

  const set = <K extends keyof Extraction>(k: K, v: Extraction[K]) => setData((d) => (d ? { ...d, [k]: v } : d));
  const conf = (k: keyof Extraction["confidence"]) => data?.confidence?.[k];

  const itemsTotal = useMemo(() => data?.deliverables.reduce((s, d) => s + (d.amount ?? 0), 0) ?? 0, [data]);
  const mismatch = !!data?.fee && itemsTotal > 0 && Math.abs(itemsTotal - data.fee) > 0.5;

  const highlightTerms = useMemo(() => {
    if (!data) return [];
    const shown = (i: number) => revealed > i;
    return [
      shown(0) ? data.brand ?? "" : "",
      shown(2) ? data.contactEmail ?? "" : "",
      ...(shown(4) ? feeVariants(data.fee) : []),
      ...(shown(8) ? data.deliverables.map((d) => d.description.split("(")[0].trim()) : []),
      shown(6) ? data.paymentTerms ?? "" : "",
    ];
  }, [data, revealed]);

  function approve() {
    if (!data) return;
    startSend(async () => {
      const res = await approveAndSendAction(data, {
        draftId: draft?.id,
        sourceEmail: emailText,
        confidence: data.confidence as Record<string, number>,
      });
      if (!res.ok) {
        toast.error("Invoice not sent", { description: res.error });
        return;
      }
      setSent({ dealId: res.dealId, invoiceNumber: res.invoiceNumber, simulated: res.simulated, note: res.note });
      // Leave the note on screen long enough to read.
      setTimeout(() => router.push(`/app/deals/${res.dealId}?sent=1`), res.note ? 6000 : 2600);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-caption font-medium text-emerald-ink">New deal</p>
          <h1 className="mt-1 font-heading text-[1.75rem] leading-tight font-extrabold tracking-[-0.03em] sm:text-h1">
            {draft ? "Check the terms, then approve" : "Turn a brand email into an invoice"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            The agent pulls out the deal. You check it. Nothing is sent until you click Approve.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 self-start rounded-full bg-surface px-3 py-1.5 text-caption font-medium shadow-soft-sm ring-1 ring-line sm:self-auto">
          <span className={cn("size-2 rounded-full", aiLive ? "bg-emerald" : "bg-amber")} />
          {aiLive ? "AI: live model, with fallbacks" : "AI: built-in reader (add keys for a live model)"}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---------------- Left: the email ---------------- */}
        <Card className="flex min-h-[560px] flex-col overflow-hidden">
          <div className="flex items-center gap-1 border-b border-line/70 p-2" role="tablist">
            {([["inbox", "Demo inbox", Inbox], ["paste", "Paste email", ClipboardPaste]] as const).map(([k, l, Icon]) => (
              <button
                key={k}
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={cn("relative flex h-9 items-center gap-2 rounded-xl px-3 text-caption font-medium transition-colors", tab === k ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {tab === k && <motion.span layoutId="intake-tab" className="absolute inset-0 rounded-xl bg-surface-sunken" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
                <Icon className="relative size-4" aria-hidden />
                <span className="relative">{l}</span>
              </button>
            ))}
          </div>

          {tab === "inbox" && !selected && (
            <ul className="divide-y divide-line/60">
              {emails.map((e, i) => (
                <motion.li key={e.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.35, ease }}>
                  <button onClick={() => setSelected(e)} className="group flex w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-surface-sunken sm:px-5">
                    <span className={cn("grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br font-heading leading-none font-bold text-ink", e.avatar)}>
                      {e.from.split("·")[1]?.trim().slice(0, 1) ?? e.from.slice(0, 1)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-semibold">{e.from}</span>
                        <span className="shrink-0 text-micro tracking-normal text-muted-foreground">{e.receivedAgo}</span>
                      </span>
                      <span className="block truncate text-[0.875rem]">{e.subject}</span>
                      <span className="block truncate text-caption text-muted-foreground">{e.preview}</span>
                    </span>
                    <ArrowRight className="mt-3 size-4 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden />
                  </button>
                </motion.li>
              ))}
            </ul>
          )}

          {tab === "inbox" && selected && (
            <motion.div key={selected.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease }} className="flex flex-1 flex-col">
              <div className="flex items-start gap-3 border-b border-line/60 px-5 py-4">
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br font-heading leading-none font-bold text-ink", selected.avatar)}>
                  {selected.from.split("·")[1]?.trim().slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{selected.subject}</p>
                  <p className="truncate text-caption text-muted-foreground">{selected.from} &lt;{selected.fromEmail}&gt;</p>
                </div>
                <button onClick={() => { setSelected(null); setPhase("idle"); setData(null); }} aria-label="Back to inbox" className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-surface-sunken">
                  <X className="size-4" />
                </button>
              </div>
              <div className="relative flex-1 overflow-hidden">
                <pre className="h-full max-h-[440px] overflow-y-auto px-5 py-4 font-sans text-[0.875rem] leading-relaxed whitespace-pre-wrap text-foreground/85">
                  <Highlighted text={selected.body} terms={highlightTerms} />
                </pre>
                <ScanBeam active={phase === "extracting"} />
              </div>
            </motion.div>
          )}

          {tab === "paste" && (
            <div className="relative flex flex-1 flex-col p-4">
              {phase === "ready" && pasted ? (
                <pre className="max-h-[440px] flex-1 overflow-y-auto rounded-xl bg-canvas p-4 font-sans text-[0.875rem] leading-relaxed whitespace-pre-wrap text-foreground/85 ring-1 ring-line/70 dark:bg-surface-sunken">
                  <Highlighted text={pasted} terms={highlightTerms} />
                </pre>
              ) : (
                <Textarea
                  value={pasted}
                  onChange={(e) => setPasted(e.target.value)}
                  placeholder={"Paste the brand's email here…\n\nInclude the signature so we can find the contact email."}
                  className="min-h-[380px] flex-1 resize-none"
                  aria-label="Brand email"
                />
              )}
              <ScanBeam active={phase === "extracting"} />
              {phase === "ready" && pasted && !draft && (
                <Button variant="ghost" size="sm" className="mt-2 self-start" onClick={() => { setPhase("idle"); setData(null); }}>
                  <Pencil /> Edit email
                </Button>
              )}
            </div>
          )}

          {!(tab === "inbox" && !selected) && phase !== "ready" && (
            <div className="border-t border-line/60 p-4">
              <Button size="lg" className="w-full" onClick={extract} loading={phase === "extracting"}>
                {phase === "extracting" ? "Reading the email…" : <><Wand2 /> Extract deal with AI</>}
              </Button>
            </div>
          )}
        </Card>

        {/* ---------------- Right: extraction ---------------- */}
        <Card className="relative flex min-h-[560px] flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-line/70 px-5 py-3.5">
            <p className="flex items-center gap-2 font-heading font-bold">
              <Sparkles className="size-4 text-emerald-ink" aria-hidden /> Deal terms
            </p>
            {source && phase === "ready" && (
              <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="rounded-full bg-emerald-soft px-2.5 py-1 text-micro font-semibold tracking-normal text-emerald-ink">
                {source === "saved" ? "Extracted earlier" : `Read by ${SOURCE_LABEL[source] ?? source}`}
              </motion.span>
            )}
          </div>

          {phase === "idle" && (
            <div className="grid flex-1 place-items-center">
              <EmptyState
                art="inbox"
                title={tab === "inbox" && !selected ? "Pick an email from the inbox" : "Ready when you are"}
                description="Brand, fee, deliverables, due date, payment terms and usage rights will appear here, field by field."
              />
            </div>
          )}

          {phase !== "idle" && (
            <div className="flex-1 space-y-4 p-5">
              {phase === "extracting" && (
                <div className="flex items-center gap-2 text-caption font-medium text-emerald-ink">
                  <motion.span animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                    <Sparkles className="size-4" aria-hidden />
                  </motion.span>
                  The agent is reading the email…
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field index={0} revealed={phase === "ready" ? revealed : 0} label="Brand" htmlFor="f-brand" confidence={conf("brand")}>
                  <Input id="f-brand" value={data?.brand ?? ""} onChange={(e) => set("brand", e.target.value)} />
                </Field>
                <Field index={1} revealed={phase === "ready" ? revealed : 0} label="Contact name" htmlFor="f-cname">
                  <Input id="f-cname" value={data?.contactName ?? ""} onChange={(e) => set("contactName", e.target.value || null)} />
                </Field>
                <Field index={2} revealed={phase === "ready" ? revealed : 0} label="Contact email" htmlFor="f-email" confidence={conf("contactEmail")} className="sm:col-span-2">
                  <Input id="f-email" type="email" value={data?.contactEmail ?? ""} onChange={(e) => set("contactEmail", e.target.value || null)} aria-invalid={phase === "ready" && !data?.contactEmail ? true : undefined} />
                </Field>
                <Field index={3} revealed={phase === "ready" ? revealed : 0} label="Currency" htmlFor="f-cur">
                  <select id="f-cur" value={data?.currency ?? "INR"} onChange={(e) => set("currency", e.target.value)} className={cn(fieldClassName, "h-11")}>
                    {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field index={4} revealed={phase === "ready" ? revealed : 0} label="Total fee" htmlFor="f-fee" confidence={conf("fee")}>
                  <Input id="f-fee" type="number" min={0} className="tabular" value={data?.fee ?? ""} onChange={(e) => set("fee", e.target.value ? Number(e.target.value) : null)} aria-invalid={phase === "ready" && !data?.fee ? true : undefined} />
                </Field>
                <Field index={5} revealed={phase === "ready" ? revealed : 0} label="Due / go-live date" htmlFor="f-due" confidence={conf("dueDate")}>
                  <Input id="f-due" type="date" value={data?.dueDate ?? ""} onChange={(e) => set("dueDate", e.target.value || null)} />
                </Field>
                <Field index={6} revealed={phase === "ready" ? revealed : 0} label="Payment terms" htmlFor="f-terms" confidence={conf("paymentTerms")}>
                  <Input id="f-terms" value={data?.paymentTerms ?? ""} placeholder="e.g. Net 30" onChange={(e) => set("paymentTerms", e.target.value || null)} />
                </Field>
                <Field index={7} revealed={phase === "ready" ? revealed : 0} label="Usage rights (days)" htmlFor="f-usage" confidence={conf("usageDays")} className="sm:col-span-2">
                  <Input id="f-usage" type="number" min={0} placeholder="None" className="tabular" value={data?.usageDays ?? ""} onChange={(e) => set("usageDays", e.target.value ? Number(e.target.value) : null)} />
                </Field>
                <Field index={8} revealed={phase === "ready" ? revealed : 0} label="Deliverables · invoice line items" confidence={conf("deliverables")} className="sm:col-span-2">
                  <div className="space-y-2 rounded-xl">
                    <AnimatePresence initial={false}>
                      {data?.deliverables.map((d, i) => (
                        <motion.div key={i} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex gap-2">
                          <Input
                            aria-label={`Deliverable ${i + 1}`}
                            value={d.description}
                            onChange={(e) => set("deliverables", data.deliverables.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))}
                          />
                          <Input
                            aria-label={`Amount for deliverable ${i + 1}`}
                            type="number"
                            className="tabular w-32 shrink-0"
                            value={d.amount ?? ""}
                            onChange={(e) => set("deliverables", data.deliverables.map((x, j) => (j === i ? { ...x, amount: e.target.value ? Number(e.target.value) : null } : x)))}
                          />
                          <Button variant="ghost" size="icon" aria-label={`Remove deliverable ${i + 1}`} onClick={() => set("deliverables", data.deliverables.filter((_, j) => j !== i))}>
                            <Trash2 />
                          </Button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    <div className="flex items-center justify-between gap-2">
                      <Button variant="ghost" size="sm" onClick={() => set("deliverables", [...(data?.deliverables ?? []), { description: "", platform: null, amount: null }])}>
                        <Plus /> Add line
                      </Button>
                      <span className={cn("tabular text-caption", mismatch ? "font-semibold text-coral-ink" : "text-muted-foreground")}>
                        Lines: {money(itemsTotal, data?.currency ?? "INR")}{mismatch && ` ≠ fee ${money(data!.fee, data!.currency ?? "INR")}`}
                      </span>
                    </div>
                  </div>
                </Field>
              </div>
            </div>
          )}

          {phase === "ready" && revealed >= FIELD_COUNT && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease }} className="sticky bottom-0 flex flex-col gap-2 border-t border-line/70 bg-card/90 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-caption text-muted-foreground">
                <ShieldCheck className="size-4 text-emerald-ink" aria-hidden /> Nothing is sent until you approve.
              </p>
              <div className="flex gap-2">
                {draft && (
                  <form action={discardDraftAction.bind(null, draft.id)}>
                    <Button variant="ghost" type="submit">Discard</Button>
                  </form>
                )}
                <Button size="lg" onClick={() => setReviewOpen(true)} disabled={!data?.fee || !data?.contactEmail || !data?.brand}>
                  <Eye /> Review invoice
                </Button>
              </div>
            </motion.div>
          )}
        </Card>
      </div>

      {data && (
        <Dialog
          open={reviewOpen}
          onClose={() => !sending && !sent && setReviewOpen(false)}
          dismissable={!sending && !sent}
          title={sent ? "Invoice sent" : "Approve this invoice?"}
          description={sent ? undefined : paypalLive ? "This is exactly what PayPal will send to the brand." : "Preview of the PayPal invoice. PayPal is simulated until sandbox keys are added."}
        >
          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="relative flex flex-col items-center py-8 text-center">
                <div className="relative grid size-24 place-items-center">
                  <ShieldPulse />
                  <Confetti count={36} spread={180} />
                  <motion.div initial={{ scale: 0.4, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 320, damping: 14 }}>
                    <ShieldMark className="size-20 text-emerald" animate />
                  </motion.div>
                </div>
                <p className="mt-6 font-heading text-h2 font-extrabold">On its way to {data.brand}</p>
                <p className="mt-2 max-w-sm text-muted-foreground">
                  Invoice <span className="tabular">{sent.invoiceNumber}</span> sent{sent.simulated ? " (simulated)" : " via PayPal"}. We&apos;ll keep an eye on it and nudge {data.brand} if it runs late.
                </p>
                {sent.note && <p className="mt-3 max-w-sm rounded-xl bg-amber-soft px-3 py-2 text-caption text-amber-ink">{sent.note}</p>}
                <Button className="mt-6" onClick={() => router.push(`/app/deals/${sent.dealId}`)}>Open deal <ArrowRight /></Button>
              </motion.div>
            ) : (
              <motion.div key="preview" exit={{ opacity: 0 }}>
                <InvoicePreview data={data} creator={creator} />
                <div className="mt-5 rounded-2xl bg-emerald-soft/60 p-4 ring-1 ring-emerald/15">
                  <p className="text-caption font-semibold text-emerald-ink">What happens when you approve</p>
                  <ol className="mt-2 space-y-1.5 text-caption">
                    {[
                      [Send, `PayPal emails the invoice to ${data.contactEmail}.`],
                      [CalendarClock, `We track payment against the due date (${fmtDate(data.dueDate, "long")}).`],
                      [BellRing, "If it runs late, the chase agent drafts a reminder for you to approve."],
                    ].map(([Icon, t], i) => {
                      const I = Icon as typeof Send;
                      return <li key={i} className="flex items-start gap-2"><I className="mt-0.5 size-3.5 shrink-0 text-emerald-ink" aria-hidden />{t as string}</li>;
                    })}
                  </ol>
                </div>
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="ghost" onClick={() => setReviewOpen(false)} disabled={sending}>Cancel</Button>
                  <Button variant="secondary" onClick={() => setReviewOpen(false)} disabled={sending}><Pencil /> Edit</Button>
                  <Button size="lg" onClick={approve} loading={sending} data-autofocus>
                    {sending ? "Sending via PayPal…" : <>Approve &amp; send <Send /></>}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Dialog>
      )}
    </div>
  );
}

function ScanBeam({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div aria-hidden className="pointer-events-none absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            className="absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-emerald/20 to-transparent"
            animate={{ top: ["-15%", "100%"] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function InvoicePreview({ data, creator }: { data: Extraction; creator: { name: string; payoutEmail: string | null } }) {
  const cur = data.currency ?? "INR";
  return (
    <div className="overflow-hidden rounded-2xl bg-surface ring-1 ring-line dark:bg-surface-sunken">
      <div className="flex items-start justify-between gap-4 border-b border-line/70 p-5">
        <div>
          <p className="flex items-center gap-1.5 text-micro font-semibold text-muted-foreground uppercase"><FileText className="size-3" aria-hidden /> Invoice</p>
          <p className="mt-1 font-heading text-h3 font-bold">{data.title ?? `${data.brand} partnership`}</p>
        </div>
        <span className="rounded-full bg-surface-sunken px-2.5 py-1 text-micro font-semibold tracking-normal text-muted-foreground dark:bg-surface">Number assigned by PayPal</span>
      </div>
      <div className="grid gap-4 border-b border-line/70 p-5 text-caption sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground">From</p>
          <p className="mt-0.5 font-semibold">{creator.name}</p>
          {creator.payoutEmail && <p className="text-muted-foreground">{creator.payoutEmail}</p>}
        </div>
        <div>
          <p className="text-muted-foreground">Bill to</p>
          <p className="mt-0.5 font-semibold">{data.contactName ?? data.brand}</p>
          <p className="break-all text-muted-foreground">{data.brand} · {data.contactEmail}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Due</p>
          <p className="mt-0.5 font-semibold">{fmtDate(data.dueDate, "long")}</p>
          <p className="text-muted-foreground">{data.paymentTerms ?? "—"}</p>
        </div>
      </div>
      <table className="w-full text-[0.875rem]">
        <thead>
          <tr className="text-left text-micro text-muted-foreground uppercase">
            <th className="px-5 pt-4 pb-2 font-semibold">Item</th>
            <th className="px-5 pt-4 pb-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.deliverables.map((d, i) => (
            <tr key={i} className="border-t border-line/50">
              <td className="px-5 py-2.5">{d.description || "Untitled item"}</td>
              <td className="tabular px-5 py-2.5 text-right">{money(d.amount, cur)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-line">
            <td className="px-5 py-4 font-semibold">Total</td>
            <td className="tabular px-5 py-4 text-right font-heading text-h3 font-bold">{money(data.fee, cur)}</td>
          </tr>
        </tfoot>
      </table>
      {data.usageDays && (
        <p className="border-t border-line/70 px-5 py-3 text-caption text-muted-foreground">
          Includes {data.usageDays} days of usage rights. DealGuard will guard the expiry date.
        </p>
      )}
    </div>
  );
}
