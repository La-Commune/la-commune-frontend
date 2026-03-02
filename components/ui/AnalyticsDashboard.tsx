"use client";

import { useEffect, useState } from "react";
import { useFirestore } from "reactfire";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  getStampEventsInRange,
  getTotalCustomers,
  getTotalRedemptions,
  StampEventRaw,
} from "@/services/analytics.service";
import { getAllCustomers } from "@/services/customer.service";
import { Customer } from "@/models/customer.model";
import { Timestamp } from "firebase/firestore";
import { toast } from "@/components/ui/use-toast";

type Range = 7 | 30 | 90;

/* ── Helpers ─────────────────────────────────────────── */

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string | number;
}

interface ChartPoint {
  label: string;
  sellos: number;
}

function dateKey(ts: Timestamp | null | undefined): string {
  const d = ts?.toDate?.() ?? new Date();
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function lastNDays(n: number): { key: string; label: string }[] {
  const result: { key: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    result.push({
      key: d.toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat("es-MX", { weekday: "short", day: "numeric" }).format(d),
    });
  }
  return result;
}

function buildChartData(events: StampEventRaw[], range: Range): ChartPoint[] {
  const stamps = events.filter((e) => e.source !== "redemption");

  if (range === 7) {
    return lastNDays(7).map(({ key, label }) => ({
      label,
      sellos: stamps.filter((e) => dateKey(e.createdAt) === key).length,
    }));
  }

  if (range === 30) {
    // 4 grupos semanales
    return Array.from({ length: 4 }, (_, i) => {
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);
      const label = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" }).format(weekStart);
      const sellos = stamps.filter((e) => {
        const d = e.createdAt?.toDate?.() ?? new Date();
        return d >= weekStart && d <= weekEnd;
      }).length;
      return { label, sellos };
    }).reverse();
  }

  // range === 90: 3 grupos mensuales
  return Array.from({ length: 3 }, (_, i) => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const label = new Intl.DateTimeFormat("es-MX", { month: "short" }).format(monthStart);
    const sellos = stamps.filter((e) => {
      const d = e.createdAt?.toDate?.() ?? new Date();
      return d >= monthStart && d <= monthEnd;
    }).length;
    return { label, sellos };
  }).reverse();
}

function buildDrinkData(events: StampEventRaw[], topN = 8): { name: string; count: number }[] {
  const drinkCount: Record<string, number> = {};
  events.forEach((e) => {
    if (e.drinkType && e.source !== "redemption") {
      drinkCount[e.drinkType] = (drinkCount[e.drinkType] ?? 0) + 1;
    }
  });
  return Object.entries(drinkCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

/* ── Tarjeta de stat ─────────────────────────────────── */

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-stone-800 bg-neutral-900 px-5 py-5 space-y-1.5">
      <p className="text-[10px] uppercase tracking-[0.35em] text-stone-600">{label}</p>
      <p className="text-3xl font-light text-stone-100">{value}</p>
      {sub && <p className="text-[11px] text-stone-600">{sub}</p>}
    </div>
  );
}

/* ── Tooltips ────────────────────────────────────────── */

function CustomTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-neutral-800 border border-stone-700 rounded-xl px-3 py-2 text-[11px]">
      <p className="text-stone-400 mb-1">{label}</p>
      <p className="text-stone-100 font-medium">{payload[0].value} sellos</p>
    </div>
  );
}

function CustomTooltipDrink({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-neutral-800 border border-stone-700 rounded-xl px-3 py-2 text-[11px]">
      <p className="text-stone-400 mb-1">{label}</p>
      <p className="text-stone-100 font-medium">{payload[0].value} pedidos</p>
    </div>
  );
}

/* ── Componente principal ────────────────────────────── */

export function AnalyticsDashboard() {
  const firestore = useFirestore();

  const [loading, setLoading] = useState(true);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalRedemptions, setTotalRedemptions] = useState(0);
  const [allEvents, setAllEvents] = useState<StampEventRaw[]>([]);
  const [range, setRange] = useState<Range>(30);
  const [customers, setCustomers] = useState<(Customer & { id: string })[]>([]);

  useEffect(() => {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    Promise.all([
      getTotalCustomers(firestore),
      getTotalRedemptions(firestore),
      getStampEventsInRange(firestore, ninetyDaysAgo),
      getAllCustomers(firestore),
    ])
      .then(([total, redemptions, evts, allCustomers]) => {
        setTotalCustomers(total);
        setTotalRedemptions(redemptions);
        setAllEvents(evts);
        setCustomers(allCustomers);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        toast({ variant: "destructive", title: "Error al cargar analytics", description: "No se pudieron obtener los datos. Intenta recargar." });
      });
  }, [firestore]);

  // Filtrar eventos según el rango seleccionado
  const rangeDate = new Date();
  rangeDate.setDate(rangeDate.getDate() - range);
  const events = allEvents.filter((e) => (e.createdAt?.toDate?.() ?? new Date()) >= rangeDate);

  const rangeStamps = events.filter((e) => e.source !== "redemption").length;
  const chartData = buildChartData(events, range);
  const drinkData = buildDrinkData(events);
  const topDrink = drinkData[0]?.name ?? "—";

  // Top referidores: contar cuántas personas ha referido cada cliente
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const referralCountById = new Map<string, number>();
  customers.forEach((c) => {
    if (c.referrerCustomerId) {
      referralCountById.set(c.referrerCustomerId, (referralCountById.get(c.referrerCustomerId) ?? 0) + 1);
    }
  });
  const topReferrers = Array.from(referralCountById.entries())
    .map(([id, count]) => ({ id, count, name: customerById.get(id)?.name ?? "Sin nombre" }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const rangeLabel = range === 7 ? "7 días" : range === 30 ? "30 días" : "90 días";

  const BAR_COLOR = "#A8956E";
  const BAR_DIM = "#3D3632";

  if (loading) {
    return (
      <div className="w-full max-w-3xl mx-auto space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-stone-900 animate-pulse" />
          ))}
        </div>
        <div className="h-52 rounded-2xl bg-stone-900 animate-pulse" />
        <div className="h-52 rounded-2xl bg-stone-900 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Clientes activos" value={totalCustomers} />
        <StatCard label={`Sellos · ${rangeLabel}`} value={rangeStamps} />
        <StatCard label="Canjes totales" value={totalRedemptions} />
        <StatCard label="Bebida top" value={topDrink} />
      </div>

      {/* Toggle de rango + gráficas */}
      <div className="space-y-4">
        {/* Header con toggle */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.35em] text-stone-600">
            Actividad
          </p>
          <div className="flex gap-1 p-0.5 bg-neutral-900 border border-stone-800 rounded-lg">
            {([7, 30, 90] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-md text-[10px] uppercase tracking-[0.25em] transition-all duration-150 ${
                  range === r
                    ? "bg-stone-700 text-stone-100"
                    : "text-stone-600 hover:text-stone-400"
                }`}
              >
                {r}d
              </button>
            ))}
          </div>
        </div>

        {/* Gráfica 1 — Sellos por período */}
        <div className="rounded-2xl border border-stone-800 bg-neutral-900 px-5 py-6 space-y-4">
          <p className="text-[10px] uppercase tracking-[0.35em] text-stone-600">
            Sellos · {rangeLabel === "7 días" ? "por día" : rangeLabel === "30 días" ? "por semana" : "por mes"}
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={22} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#57534E" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#57534E" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="sellos" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.sellos > 0 ? BAR_COLOR : BAR_DIM} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfica 2 — Bebidas más populares */}
        {drinkData.length > 0 && (
          <div className="rounded-2xl border border-stone-800 bg-neutral-900 px-5 py-6 space-y-4">
            <p className="text-[10px] uppercase tracking-[0.35em] text-stone-600">
              Bebidas más pedidas · {rangeLabel}
            </p>
            <ResponsiveContainer width="100%" height={Math.max(180, drinkData.length * 40)}>
              <BarChart
                data={drinkData}
                layout="vertical"
                barSize={16}
                margin={{ top: 4, right: 8, left: 4, bottom: 0 }}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "#57534E" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fontSize: 11, fill: "#A8A29E" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltipDrink />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} fill={BAR_COLOR} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {drinkData.length === 0 && (
          <div className="rounded-2xl border border-stone-800 bg-neutral-900 px-5 py-8 text-center">
            <p className="text-stone-700 text-sm">Sin datos de bebidas en este período</p>
            <p className="text-[10px] uppercase tracking-widest text-stone-800 mt-1">
              Los sellos registran la bebida al agregarlos
            </p>
          </div>
        )}
      </div>

      {/* Top referidores */}
      <div className="rounded-2xl border border-stone-800 bg-neutral-900 px-5 py-6 space-y-4">
        <p className="text-[10px] uppercase tracking-[0.35em] text-stone-600">Top referidores</p>
        {topReferrers.length === 0 ? (
          <p className="text-stone-700 text-sm">Sin referidos registrados aún</p>
        ) : (
          <div className="space-y-2.5">
            {topReferrers.map(({ id, name, count }) => (
              <div key={id} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full border border-stone-700 bg-neutral-950 flex items-center justify-center shrink-0">
                  <span className="text-[10px] text-stone-400">{name[0]?.toUpperCase() ?? "?"}</span>
                </div>
                <span className="flex-1 text-sm text-stone-300 truncate">{name}</span>
                <span className="text-[11px] tabular-nums text-amber-600/80">
                  {count} {count === 1 ? "referido" : "referidos"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
