import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Droplet, Home, CalendarPlus, History, MapPin, User, LayoutDashboard, Users,
  Package, Megaphone, ClipboardCheck, Hospital, LogOut, Inbox,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";

const donorNav = [
  { to: "/painel", label: "Início", icon: Home },
  { to: "/agendar", label: "Agendar doação", icon: CalendarPlus },
  { to: "/historico", label: "Carteira e histórico", icon: History },
  { to: "/centros", label: "Centros de colheita", icon: MapPin },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

const adminNav = [
  { to: "/admin", label: "Visão geral", icon: LayoutDashboard },
  { to: "/admin/doadores", label: "Doadores", icon: Users },
  { to: "/admin/estoque", label: "Estoque", icon: Package },
  { to: "/admin/agendamentos", label: "Agendamentos", icon: ClipboardCheck },
  { to: "/admin/campanhas", label: "Campanhas", icon: Megaphone },
  { to: "/admin/pedidos", label: "Pedidos hospitalares", icon: Inbox },
] as const;

function NavItem({ to, label, icon: Icon }: { to: string; label: string; icon: typeof Home }) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: true }}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-semibold" }}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

export function AppShell() {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await supabase.auth.signOut();
    qc.clear();
    navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 overflow-y-auto">
        <div className="flex items-center gap-2 px-5 py-5">
          <Droplet className="h-6 w-6 fill-current" />
          <span className="font-display text-xl font-semibold">Gota Viva</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
          <p className="hidden px-3 pt-2 pb-1 text-xs uppercase tracking-wider text-sidebar-foreground/50 md:block">Doador</p>
          {donorNav.map((n) => <NavItem key={n.to} {...n} />)}
          {me?.isHospital && (
            <>
              <p className="hidden px-3 pt-4 pb-1 text-xs uppercase tracking-wider text-sidebar-foreground/50 md:block">Hospital</p>
              <NavItem to="/hospital" label="Pedidos de sangue" icon={Hospital} />
            </>
          )}
          {me?.isAdmin && (
            <>
              <p className="hidden px-3 pt-4 pb-1 text-xs uppercase tracking-wider text-sidebar-foreground/50 md:block">Gestão</p>
              {adminNav.map((n) => <NavItem key={n.to} {...n} />)}
            </>
          )}
        </nav>
        <div className="hidden px-3 pb-5 md:block">
          <div className="mb-2 truncate px-3 text-xs text-sidebar-foreground/60">{me?.user.email}</div>
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 px-5 py-8 md:px-10">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
        <button onClick={signOut} className="mt-10 text-sm text-muted-foreground underline md:hidden">Sair</button>
      </main>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { data: me, isLoading } = useMe();
  if (isLoading) return <p className="text-muted-foreground">A carregar…</p>;
  if (!me?.isAdmin)
    return <div className="panel p-8 text-center"><h2 className="text-2xl">Acesso restrito</h2><p className="mt-2 text-muted-foreground">Esta área é exclusiva para administradores.</p></div>;
  return <>{children}</>;
}
