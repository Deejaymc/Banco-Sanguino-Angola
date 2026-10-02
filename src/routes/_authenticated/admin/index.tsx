import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminOnly, PageHeader } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { stockLevel } from "@/lib/blood";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Visão geral — Gestão Gota Viva" }] }),
  component: AdminHome,
});

function AdminHome() {
  const { data } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [p, d, r, inv, a] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("donations").select("donated_at"),
        supabase.from("hospital_requests").select("id", { count: "exact", head: true }).eq("status", "pendente"),
        supabase.from("inventory").select("*").order("blood_type"),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "agendado"),
      ]);
      const now = new Date();
      const thisMonth = (d.data ?? []).filter((x) => {
        const dt = new Date(x.donated_at);
        return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
      }).length;
      return {
        donors: p.count ?? 0,
        donations: d.data?.length ?? 0,
        thisMonth,
        pendingRequests: r.count ?? 0,
        upcoming: a.count ?? 0,
        inventory: inv.data ?? [],
      };
    },
  });

  const stats = [
    { label: "Doadores registados", value: data?.donors ?? "…" },
    { label: "Doações totais", value: data?.donations ?? "…" },
    { label: "Doações este mês", value: data?.thisMonth ?? "…" },
    { label: "Agendamentos ativos", value: data?.upcoming ?? "…" },
    { label: "Pedidos pendentes", value: data?.pendingRequests ?? "…" },
  ];

  return (
    <AdminOnly>
      <PageHeader title="Visão geral" subtitle="O pulso do banco de sangue em tempo real." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="panel p-5">
            <p className="font-display text-4xl font-semibold text-primary">{s.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
      <section className="panel mt-6 p-6">
        <h2 className="text-xl">Estoque por tipo sanguíneo</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {(data?.inventory ?? []).map((i) => {
            const s = stockLevel(i.units, i.min_units);
            const pct = Math.min(100, Math.round((i.units / (i.min_units * 2)) * 100));
            return (
              <div key={i.blood_type} className="rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <span className="font-display text-2xl font-semibold">{i.blood_type}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.tone}`}>{s.label}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{i.units} unidades (mín. {i.min_units})</p>
                <div className="mt-2 h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </AdminOnly>
  );
}
