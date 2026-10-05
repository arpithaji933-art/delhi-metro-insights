import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Station = {
  id: string;
  name: string;
  line: string;
  zone: string;
  is_interchange: boolean;
  opened_year: number;
};
export type Daily = { station_id: string; day: string; entries: number; exits: number };
export type Hourly = { station_id: string; hour: number; avg_entries: number };

export const stationsQuery = queryOptions({
  queryKey: ["stations"],
  queryFn: async () => {
    const { data, error } = await supabase.from("stations").select("*").order("name");
    if (error) throw error;
    return data as Station[];
  },
});

export const dailyQuery = queryOptions({
  queryKey: ["ridership_daily"],
  queryFn: async () => {
    const all: Daily[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from("ridership_daily")
        .select("station_id, day, entries, exits")
        .order("day")
        .range(from, from + 999);
      if (error) throw error;
      all.push(...(data as Daily[]));
      if (!data || data.length < 1000) break;
    }
    return all;
  },
});

export const hourlyQuery = queryOptions({
  queryKey: ["ridership_hourly"],
  queryFn: async () => {
    const { data, error } = await supabase.from("ridership_hourly").select("station_id, hour, avg_entries").order("hour");
    if (error) throw error;
    return data as Hourly[];
  },
});

export const fmt = (n: number) => new Intl.NumberFormat("en-IN").format(Math.round(n));
