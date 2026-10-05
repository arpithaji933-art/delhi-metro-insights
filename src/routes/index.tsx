import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Database, Lock, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import hero from "@/assets/hero-metro.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MetroPulse — Delhi Metro Passenger Demand Analytics" },
      { name: "description", content: "Track footfall across Delhi Metro stations, spot peak hours and compare line demand." },
      { property: "og:title", content: "MetroPulse — Delhi Metro Passenger Demand Analytics" },
      { property: "og:description", content: "Track footfall across Delhi Metro stations, spot peak hours and compare line demand." },
    ],
  }),
  component: Home,
});

const features = [
  { icon: Lock, title: "Secure sign in", text: "Email or Google login with admin and viewer roles." },
  { icon: Database, title: "Station & passenger data", text: "24 stations across 7 lines with 90 days of daily entries and exits." },
  { icon: BarChart3, title: "Analytics dashboard", text: "Trends, busiest stations, line share and weekday patterns." },
  { icon: Clock, title: "Peak-hour insight", text: "Hourly demand curves to plan trains and crowd control." },
];

function Home() {
  return (
    <main>
      <section className="relative isolate min-h-[78vh] overflow-hidden">
        <img src={hero} alt="Delhi Metro train on an elevated track at sunset" width={1600} height={912} className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-hero-overlay" />
        <div className="mx-auto flex min-h-[78vh] max-w-7xl flex-col justify-end px-4 pb-20 text-on-hero">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-accent">Passenger Demand Analytics</p>
          <h1 className="max-w-3xl text-5xl font-extrabold leading-[1.05] md:text-7xl">
            Read the pulse of the Delhi Metro.
          </h1>
          <p className="mt-6 max-w-xl text-lg opacity-90">
            See where and when commuters move — station by station, hour by hour.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="secondary"><Link to="/dashboard">Open dashboard</Link></Button>
            <Button asChild size="lg"><Link to="/auth">Sign in</Link></Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20">
        <h2 className="text-3xl font-bold md:text-4xl">Four modules, one view of demand</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-6 shadow-card">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        MetroPulse · Sample data for academic analysis of Delhi Metro demand
      </footer>
    </main>
  );
}
