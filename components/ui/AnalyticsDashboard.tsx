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
  getAllStampEvents,
  getTotalCustomers,
  getTotalRedemptions,
  StampEventRaw,
} from "@/services/analytics.service";

/* ── Helpers ─────────────────────────────────────────── */

function dateKey(ts: any): string {
  const d = ts?.toDate?.() ?? new Date();
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function last7Days(): { key: string; label: string }[] {
  const result: { key: string; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    result.push({
      key: d.toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat("es-MX", { weekday: "short", day: "numeric" }).format(d),
    });
  }
  return result;
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

/* ── Tooltip personalizado ───────────────────────────── */

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-neutral-800 border border-stone-700 rounded-xl px-3 py-2 text-[11px]">
      <p className="text-stone-400 mb-1">{label}</p>
      <p className="text-stone-100 font-medium">{payload[0].value} sellos</p>
    </div>
  );
}

function CustomTooltipDrink({ active, payload, label }: any) {
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
  const [weekEvents, setWeekEvents] = useState<StampEventRaw[]>([]);
  const [allEvents, setAllEvents] = useState<StampEventRaw[]>([]);

  useEffect(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    Promise.all([
      getTotalCustomers(firestore),
      getTotalRedemptions(firestore),
      getStampEventsInRange(firestore, weekAgo),
      getAllStampEvents(firestore),
    ]).then(([customers, redemptions, week, all]) => {
      setTotalCustomers(customers);
      setTotalRedemptions(redemptions);
      setWeekEvents(week);
      setAllEvents(all);
      setLoading(false);
    });
  }, [firestore]);

  /* Sellos esta semana */
  const weekStamps = weekEvents.filter((e) => e.source !== "redemption").length;

  /* Gráfica 1: visitas por día (últimos 7 días) */
  const days = last7Days();
  const stampsByDay = days.map(({ key, label }) => ({
    label,
    sellos: weekEvents.filter(
      (e) => e.source !== "redemption" && dateKey(e.createdAt) === key
    ).length,
  }));

  /* Gráfica 2: bebidas más populares */
  const drinkCount: Record<string, number> = {};
  allEvents.forEach((e) => {
    if (e.drinkType) {
      drinkCount[e.drinkType] = (drinkCount[e.drinkType] ?? 0) + 1;
    }
  });
  const drinkData = Object.entries(drinkCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const topDrink = drinkData[0]?.name ?? "—";

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
        <StatCard label="Sellos esta semana" value={weekStamps} />
        <StatCard label="Canjes totales" value={totalRedemptions} />
        <StatCard label="Bebida top" value={topDrink} />
      </div>

      {/* Gráfica 1 — Sellos por día */}
      <div className="rounded-2xl border border-stone-800 bg-neutral-900 px-5 py-6 space-y-4">
        <p className="text-[10px] uppercase tracking-[0.35em] text-stone-600">
          Sellos · últimos 7 días
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={stampsByDay} barSize={22} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
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
              {stampsByDay.map((entry, i) => (
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
            Bebidas más pedidas
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
          <p className="text-stone-700 text-sm">Sin datos de bebidas todavía</p>
          <p className="text-[10px] uppercase tracking-widest text-stone-800 mt-1">
            Los sellos registran la bebida al agregarlos
          </p>
        </div>
      )}
    </div>
  );
}
