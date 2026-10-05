import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { TrainFront, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function SiteHeader() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const linkCls = "text-sm font-medium text-muted-foreground hover:text-foreground transition-colors";
  const activeCls = { className: "text-sm font-semibold text-foreground" };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="h-1 line-stripe" />
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <TrainFront className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-bold">MetroPulse</span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          <Link to="/" className={linkCls} activeProps={activeCls} activeOptions={{ exact: true }}>Home</Link>
          <Link to="/stations" className={linkCls} activeProps={activeCls}>Stations & Data</Link>
          <Link to="/dashboard" className={linkCls} activeProps={activeCls}>Analytics</Link>
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
              {role && <Badge variant={role === "admin" ? "default" : "secondary"}>{role}</Badge>}
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </>
          ) : (
            <Button asChild size="sm"><Link to="/auth">Sign in</Link></Button>
          )}
        </div>
      </div>
    </header>
  );
}
