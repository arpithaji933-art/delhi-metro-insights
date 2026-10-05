import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { stationsQuery, dailyQuery, hourlyQuery, fmt } from "@/lib/metro-data";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Analytics Dashboard — MetroPulse" },
      { name: "description", content: "Ridership trends, busiest stations, line share and peak hours on the Delhi Metro." },
      { property: "og:title", content: "Analytics Dashboard — MetroPulse" },
      { property: "og:description", content: "Ridership trends, busiest stations, line share and peak hours on the Delhi Metro." },
    ],
  }),
  component: Dashboard,
});

const LINE_VAR: Record<string, string> = {
  Red: "var(--line-red)", Yellow: "var(--line-yellow)", Blue: "var(--line-blue)", Violet: "var(--line-violet)",
  Magenta: "var(--line-magenta)", Pink: "var(--line-pink)", "Airport Express": "var(--line-orange)",
};
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const tip = { contentStyle: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 } };

function Dashboard() {
  const stations = useQuery(stationsQuery);
  const daily = useQuery(dailyQuery);
  const hourly = useQuery(hourlyQuery);
  const [line, setLine] = useState("all");

  const a = useMemo(() => {
    const st = stations.data ?? [];
    const byId = new Map(st.map((s) => [s.id, s]));
    const keep = new Set(st.filter((s) => line === "all" || s.line === line).map((s) => s.id));
    const d = (daily.data ?? []).filter((r) => keep.has(r.station_id));

    const perDay = new Map<string, number>();
    const perStation = new Map<string, number>();
    const perLine = new Map<string, number>();
    const dow = Array.from({ length: 7 }, () => ({ sum: 0, n: new Set<string>() }));
    let total = 0;
    for (const r of d) {
      total += r.entries;
      perDay.set(r.day, (perDay.get(r.day) ?? 0) + r.entries);
      perStation.set(r.station_id, (perStation.get(r.station_id) ?? 0) + r.entries);
      const ln = byId.get(r.station_id)?.line ?? "?";
      perLine.set(ln, (perLine.get(ln) ?? 0) + r.entries);
      const w = new Date(r.day + "T00:00:00").getDay();
      const slot = dow[w]!; slot.sum += r.entries; slot.n.add(r.day);
    }
    const days = perDay.size || 1;
    const trend = [...perDay.entries()].sort().map(([day, v]) => ({ day: day.slice(5), entries: v }));
    const top = [...perStation.entries()].sort((x, y) => y[1] - x[1]).slice(0, 10)
      .map(([id, v]) => ({ name: byId.get(id)?.name ?? "", avg: Math.round(v / days), line: byId.get(id)?.line ?? "" }));
    const lines = [...perLine.entries()].map(([name, value]) => ({ name, value }));
    const week = dow.map((x, i) => ({ day: DOW[i], avg: x.n.size ? Math.round(x.sum / x.n.size) : 0 }));
    const hours = new Map<number, number>();
    for (const h of hourly.data ?? []) if (keep.has(h.station_id)) hours.set(h.hour, (hours.get(h.hour) ?? 0) + h.avg_entries);
    const hourArr = [...hours.entries()].sort((x, y) => x[0] - y[0]).map(([h, v]) => ({ hour: `${h}:00`, entries: v }));
    const peak = hourArr.reduce((m, x) => (x.entries > m.entries ? x : m), { hour: "—", entries: 0 });
    const last7 = trend.slice(-7).reduce((s, x) => s + x.entries, 0);
    const prev7 = trend.slice(-14, -7).reduce((s, x) => s + x.entries, 0);
    return {
      total, avgDaily: total / days, top, trend, lines, week, hourArr, peak,
      wow: prev7 ? ((last7 - prev7) / prev7) * 100 : 0, stationCount: keep.size,
    };
  }, [stations.data, daily.data, hourly.data, line]);

  const loading = stations.isLoading || daily.isLoading;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics dashboard</h1>
          <p className="mt-1 text-muted-foreground">Passenger demand over the last 90 days</p>
        </div>
        <Select value={line} onValueChange={setLine}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All lines</SelectItem>
            {Object.keys(LINE_VAR).map((l) => <SelectItem key={l} value={l}>{l} Line</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? <p className="mt-10 text-muted-foreground">Loading data…</p> : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Total entries (90d)" value={fmt(a.total)} />
            <Kpi label="Avg daily entries" value={fmt(a.avgDaily)} />
            <Kpi label="Peak hour" value={a.peak.hour} sub={`${fmt(a.peak.entries)} entries/hr`} />
            <Kpi label="Week over week" value={`${a.wow >= 0 ? "+" : ""}${a.wow.toFixed(1)}%`} sub={`${a.stationCount} stations`} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Panel title="Daily ridership trend" className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={a.trend}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} interval={13} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip {...tip} formatter={(v: number) => fmt(v)} />
                  <Area dataKey="entries" stroke="var(--chart-1)" strokeWidth={2} fill="url(#g1)" />
                </AreaChart>
              </ResponsiveContainer>
            </Panel>
            <Panel title="Share by line">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={a.lines} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                    {a.lines.map((l) => <Cell key={l.name} fill={LINE_VAR[l.name] ?? "var(--muted-foreground)"} />)}
                  </Pie>
                  <Tooltip {...tip} formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Panel title="Top 10 busiest stations (avg daily entries)">
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={a.top} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip {...tip} formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="avg" radius={[0, 6, 6, 0]}>
                    {a.top.map((t) => <Cell key={t.name} fill={LINE_VAR[t.line] ?? "var(--chart-1)"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Panel>
            <Panel title="Hourly demand profile">
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={a.hourArr}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip {...tip} formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="entries" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          <Panel title="Average entries by weekday" className="mt-6">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={a.week}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip {...tip} formatter={(v: number) => fmt(v)} />
                <Bar dataKey="avg" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        </>
      )}
    </main>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-card">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border bg-card p-5 shadow-card ${className}`}>
      <h2 className="mb-4 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}
