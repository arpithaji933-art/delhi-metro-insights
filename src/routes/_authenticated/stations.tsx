import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, LINE_COLOR } from "@/lib/auth";
import { stationsQuery, dailyQuery, fmt } from "@/lib/metro-data";

export const Route = createFileRoute("/_authenticated/stations")({
  head: () => ({
    meta: [
      { title: "Stations & Passenger Data — MetroPulse" },
      { name: "description", content: "Browse Delhi Metro stations and their daily passenger entries and exits." },
      { property: "og:title", content: "Stations & Passenger Data — MetroPulse" },
      { property: "og:description", content: "Browse Delhi Metro stations and their daily passenger entries and exits." },
    ],
  }),
  component: StationsPage,
});

const LINES = ["Red", "Yellow", "Blue", "Violet", "Magenta", "Pink", "Airport Express"];

function StationsPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const stations = useQuery(stationsQuery);
  const daily = useQuery(dailyQuery);
  const [q, setQ] = useState("");
  const [line, setLine] = useState("all");

  const rows = useMemo(() => {
    const totals = new Map<string, { e: number; x: number; days: number; last?: { day: string; entries: number } }>();
    for (const d of daily.data ?? []) {
      const t = totals.get(d.station_id) ?? { e: 0, x: 0, days: 0 };
      t.e += d.entries; t.x += d.exits; t.days++;
      if (!t.last || d.day > t.last.day) t.last = { day: d.day, entries: d.entries };
      totals.set(d.station_id, t);
    }
    return (stations.data ?? [])
      .filter((s) => (line === "all" || s.line === line) && s.name.toLowerCase().includes(q.toLowerCase()))
      .map((s) => ({ ...s, t: totals.get(s.id) }));
  }, [stations.data, daily.data, q, line]);

  const remove = async (id: string) => {
    const { error } = await supabase.from("stations").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Station deleted");
    qc.invalidateQueries();
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Stations & passenger data</h1>
          <p className="mt-1 text-muted-foreground">{stations.data?.length ?? 0} stations · last 90 days</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <AddStation onDone={() => qc.invalidateQueries()} />
            <AddRecord stations={stations.data ?? []} onDone={() => qc.invalidateQueries()} />
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Input placeholder="Search station…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select value={line} onValueChange={setLine}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All lines</SelectItem>
            {LINES.map((l) => <SelectItem key={l} value={l}>{l} Line</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Station</TableHead>
              <TableHead>Line</TableHead>
              <TableHead>Zone</TableHead>
              <TableHead className="text-right">Avg daily entries</TableHead>
              <TableHead className="text-right">Avg daily exits</TableHead>
              <TableHead className="text-right">Latest day</TableHead>
              {isAdmin && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {stations.isLoading && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>}
            {rows.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">
                  {s.name} {s.is_interchange && <Badge variant="outline" className="ml-2">Interchange</Badge>}
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${LINE_COLOR[s.line] ?? "bg-muted-foreground"}`} />{s.line}
                  </span>
                </TableCell>
                <TableCell>{s.zone}</TableCell>
                <TableCell className="text-right tabular-nums">{s.t ? fmt(s.t.e / s.t.days) : "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{s.t ? fmt(s.t.x / s.t.days) : "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{s.t?.last ? `${fmt(s.t.last.entries)} (${s.t.last.day})` : "—"}</TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => remove(s.id)} aria-label={`Delete ${s.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {!isAdmin && <p className="mt-4 text-sm text-muted-foreground">You have viewer access. Admins can add or edit data.</p>}
    </main>
  );
}

function AddStation({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", line: "Blue", zone: "", opened_year: 2024, is_interchange: false });
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("stations").insert(f);
    if (error) return toast.error(error.message);
    toast.success("Station added");
    setOpen(false); onDone();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Station</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add station</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-1.5"><Label>Name</Label><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Line</Label>
            <Select value={f.line} onValueChange={(v) => setF({ ...f, line: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LINES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Zone</Label><Input required value={f.zone} onChange={(e) => setF({ ...f, zone: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Opened year</Label><Input type="number" value={f.opened_year} onChange={(e) => setF({ ...f, opened_year: +e.target.value })} /></div>
          <div className="flex items-center gap-2"><Switch checked={f.is_interchange} onCheckedChange={(v) => setF({ ...f, is_interchange: v })} /><Label>Interchange</Label></div>
          <Button className="w-full">Save</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddRecord({ stations, onDone }: { stations: { id: string; name: string }[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ station_id: "", day: new Date().toISOString().slice(0, 10), entries: 0, exits: 0 });
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.station_id) return toast.error("Pick a station");
    const { error } = await supabase.from("ridership_daily").upsert(f, { onConflict: "station_id,day" });
    if (error) return toast.error(error.message);
    toast.success("Passenger record saved");
    setOpen(false); onDone();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline"><Plus className="h-4 w-4" /> Passenger record</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add daily passenger count</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-1.5"><Label>Station</Label>
            <Select value={f.station_id} onValueChange={(v) => setF({ ...f, station_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select station" /></SelectTrigger>
              <SelectContent>{stations.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={f.day} onChange={(e) => setF({ ...f, day: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Entries</Label><Input type="number" min={0} value={f.entries} onChange={(e) => setF({ ...f, entries: +e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Exits</Label><Input type="number" min={0} value={f.exits} onChange={(e) => setF({ ...f, exits: +e.target.value })} /></div>
          </div>
          <Button className="w-full">Save</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
