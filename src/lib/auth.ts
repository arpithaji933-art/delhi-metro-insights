import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "viewer";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async (u: User | null) => {
      if (!active) return;
      setUser(u);
      if (u) {
        const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.id);
        if (!active) return;
        setRole(data?.some((r) => r.role === "admin") ? "admin" : "viewer");
      } else {
        setRole(null);
      }
      setLoading(false);
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setTimeout(() => load(session?.user ?? null), 0);
    });
    supabase.auth.getSession().then(({ data }) => load(data.session?.user ?? null));
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, role, isAdmin: role === "admin", loading };
}

export const LINE_COLOR: Record<string, string> = {
  Red: "bg-line-red",
  Yellow: "bg-line-yellow",
  Blue: "bg-line-blue",
  Violet: "bg-line-violet",
  Magenta: "bg-line-magenta",
  Pink: "bg-line-pink",
  "Airport Express": "bg-line-orange",
};
