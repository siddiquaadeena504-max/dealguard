"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule, ModuleRegistry, themeQuartz,
  type ColDef, type ICellRendererParams, type RowClickedEvent,
} from "ag-grid-community";
import { Search } from "lucide-react";
import { StatusPill } from "@/components/ui/status";
import { money, fmtDate, relativeDays } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DealState } from "@/lib/deals";

ModuleRegistry.registerModules([AllCommunityModule]);

export type GridDeal = {
  id: string;
  brand: string;
  title: string;
  fee: number | null;
  currency: string;
  state: DealState;
  dueDate: string | null;
  rightsLeft: number | null;
  invoiceNumber: string | null;
};

const theme = themeQuartz.withParams({
  backgroundColor: "var(--surface)",
  foregroundColor: "var(--foreground)",
  headerBackgroundColor: "var(--surface)",
  headerTextColor: "var(--slate)",
  headerFontWeight: 600,
  headerFontSize: 12,
  borderColor: "var(--line)",
  rowBorder: { color: "var(--line)" },
  wrapperBorder: false,
  wrapperBorderRadius: 0,
  rowHoverColor: "var(--surface-sunken)",
  selectedRowBackgroundColor: "var(--emerald-soft)",
  accentColor: "var(--emerald)",
  fontFamily: "var(--font-inter), system-ui, sans-serif",
  fontSize: 14,
  rowHeight: 60,
  headerHeight: 44,
  spacing: 8,
  cellHorizontalPadding: 20,
  columnBorder: false,
});

const STATE_TO_STATUS = {
  awaiting_approval: "awaiting_approval",
  sent: "sent",
  overdue: "overdue",
  paid: "paid",
  cancelled: "failed",
} as const;

const AVATAR = ["from-emerald to-emerald-deep", "from-amber to-orange-500", "from-sky-400 to-indigo-500", "from-pink-400 to-rose-500", "from-violet-400 to-purple-600"];

function BrandCell({ data }: ICellRendererParams<GridDeal>) {
  if (!data) return null;
  const tone = AVATAR[data.brand.charCodeAt(0) % AVATAR.length];
  return (
    <div className="flex h-full items-center gap-3">
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br font-heading text-[0.85rem] leading-none font-bold text-white", tone)}>
        {data.brand.slice(0, 1)}
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate font-semibold">{data.brand}</p>
        <p className="truncate text-caption text-muted-foreground">{data.title}</p>
      </div>
    </div>
  );
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "awaiting_approval", label: "Needs approval" },
  { key: "sent", label: "Sent" },
  { key: "overdue", label: "Overdue" },
  { key: "paid", label: "Paid" },
] as const;

export function DealsGrid({ deals }: { deals: GridDeal[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [query, setQuery] = useState("");

  const rows = useMemo(
    () => deals.filter((d) => filter === "all" || d.state === filter),
    [deals, filter]
  );

  const cols = useMemo<ColDef<GridDeal>[]>(
    () => [
      { field: "brand", headerName: "Deal", flex: 2, minWidth: 240, cellRenderer: BrandCell },
      {
        field: "state", headerName: "Status", minWidth: 160, flex: 1,
        cellRenderer: ({ data }: ICellRendererParams<GridDeal>) =>
          data ? <div className="flex h-full items-center"><StatusPill status={STATE_TO_STATUS[data.state]} size="sm" /></div> : null,
      },
      {
        field: "fee", headerName: "Amount", minWidth: 130, flex: 1, type: "rightAligned",
        comparator: (a, b) => (a ?? 0) - (b ?? 0),
        cellRenderer: ({ data }: ICellRendererParams<GridDeal>) =>
          data ? <span className="tabular font-medium">{money(data.fee, data.currency)}</span> : null,
      },
      {
        field: "dueDate", headerName: "Due", minWidth: 140, flex: 1,
        cellRenderer: ({ data }: ICellRendererParams<GridDeal>) => {
          if (!data?.dueDate) return "—";
          const late = data.state === "overdue";
          return (
            <div className="flex h-full flex-col justify-center leading-tight">
              <span>{fmtDate(data.dueDate)}</span>
              <span className={cn("text-caption", late ? "text-coral-ink" : "text-muted-foreground")}>
                {data.state === "paid" ? "settled" : relativeDays(data.dueDate)}
              </span>
            </div>
          );
        },
      },
      {
        field: "rightsLeft", headerName: "Usage rights", minWidth: 150, flex: 1,
        cellRenderer: ({ data }: ICellRendererParams<GridDeal>) => {
          if (data?.rightsLeft == null) return <span className="text-muted-foreground">None</span>;
          const n = data.rightsLeft;
          if (n < 0) return <span className="text-muted-foreground">Ended</span>;
          return (
            <div className="flex h-full items-center gap-2">
              <span className="h-1.5 w-14 overflow-hidden rounded-full bg-surface-sunken">
                <span className={cn("block h-full rounded-full", n <= 7 ? "bg-amber" : "bg-emerald")} style={{ width: `${Math.min(100, (n / 90) * 100)}%` }} />
              </span>
              <span className={cn("tabular text-caption", n <= 7 && "font-semibold text-amber-ink")}>{n}d left</span>
            </div>
          );
        },
      },
      {
        field: "invoiceNumber", headerName: "Invoice", minWidth: 140, flex: 1,
        cellRenderer: ({ value }: ICellRendererParams<GridDeal>) =>
          value ? <span className="tabular text-caption text-muted-foreground">{value}</span> : <span className="text-caption text-muted-foreground">Not sent</span>,
      },
    ],
    []
  );

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-line/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Filter deals">
          {FILTERS.map((f) => {
            const count = f.key === "all" ? deals.length : deals.filter((d) => d.state === f.key).length;
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-caption font-medium transition-colors",
                  active ? "bg-ink text-[#F2F2EE] dark:bg-emerald dark:text-ink" : "text-muted-foreground hover:bg-surface-sunken hover:text-foreground"
                )}
              >
                {f.label}
                <span className={cn("tabular rounded-md px-1 text-micro tracking-normal", active ? "bg-white/15 dark:bg-ink/15" : "bg-surface-sunken")}>{count}</span>
              </button>
            );
          })}
        </div>
        <label className="relative">
          <span className="sr-only">Search deals</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search brands…"
            className="h-9 w-full rounded-xl bg-surface-sunken pr-3 pl-9 text-caption outline-none focus-visible:ring-2 focus-visible:ring-emerald/40 sm:w-56"
          />
        </label>
      </div>
      {/* Phones: tappable cards instead of a wide table */}
      <ul className="divide-y divide-line/70 md:hidden">
        {rows
          .filter((d) => !query || `${d.brand} ${d.title}`.toLowerCase().includes(query.toLowerCase()))
          .map((d) => (
            <li key={d.id}>
              <button onClick={() => router.push(`/app/deals/${d.id}`)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-surface-sunken">
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br font-heading leading-none font-bold text-white", AVATAR[d.brand.charCodeAt(0) % AVATAR.length])}>
                  {d.brand.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold">{d.brand}</span>
                    <span className="tabular shrink-0 font-medium">{money(d.fee, d.currency)}</span>
                  </span>
                  <span className="mt-1 flex items-center justify-between gap-2">
                    <span className="truncate text-caption text-muted-foreground">{d.title}</span>
                    <StatusPill status={STATE_TO_STATUS[d.state]} size="sm" />
                  </span>
                </span>
              </button>
            </li>
          ))}
      </ul>
      <div className="hidden w-full md:block">
        <AgGridReact<GridDeal>
          theme={theme}
          domLayout="autoHeight"
          rowData={rows}
          columnDefs={cols}
          quickFilterText={query}
          animateRows
          suppressCellFocus
          getRowId={(p) => p.data.id}
          rowClass="cursor-pointer"
          onRowClicked={(e: RowClickedEvent<GridDeal>) => e.data && router.push(`/app/deals/${e.data.id}`)}
          overlayNoRowsTemplate='<span style="color:var(--slate)">No deals here yet.</span>'
        />
      </div>
    </div>
  );
}
