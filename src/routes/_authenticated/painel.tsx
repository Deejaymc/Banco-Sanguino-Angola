import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Bell, CalendarClock, Droplet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { POINTS_PER_DONATION, URGENCY_LABEL, fmtDate, nextEligible } from "@/lib/blood";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({ meta: [{ title: "Início — Gota Viva" }] }),
  component: Painel,
});

function Painel() {
  const { data: me } = useMe();
  const uid = me?.user.id;
  const { data } = useQuery({
    queryKey: ["painel", uid],
    enabled: !!uid,
    queryFn: async () => {
      const [d, a, c] = await Promise.all([
        supabase.from("donations").select("*").eq("donor_id", uid!).order("donated_at", { ascending: false }),
        supabase.from("appointments").select("*, centers(name, city)").eq("donor_id", uid!).eq("status", "agendado").gte("scheduled_at", new Date().toISOString()).order("scheduled_at"),
        supabase.from("campaigns").select("*").eq("active", true).order("created_at", { ascending: false }),
      ]);
      return { donations: d.data ?? [], upcoming: a.data ?? [], campaigns: c.data ?? [] };
    },
  });

  const bt = me?.profile?.blood_type;
  const donations = data?.donations ?? [];
  const next = nextEligible(donations[0]?.donated_at);
  const canDonate = !next || next <= new Date();
  const alerts = (data?.campaigns ?? []).filter((c) => !c.blood_type || c.blood_type === bt);

  return (
    <div>
      <PageHeader title={`Olá, ${me?.profile?.full_name?.split(" ")[0] || "doador"}`} subtitle="O seu impacto, as suas doações e os alertas que importam." />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="bg-hero relative overflow-hidden rounded-2xl p-6 text-primary-foreground shadow-soft lg:col-span-2">
          <Droplet className="absolute -right-6 -top-6 h-40 w-40 fill-current opacity-10" />
          <p className="text-sm uppercase tracking-wider opacity-75">Carteira de doador</p>
          <div className="mt-4 flex flex-wrap items-end gap-10">
            <div><p className="font-display text-6xl font-semibold">{bt ?? "—"}</p><p className="text-sm opacity-75">Tipo sanguíneo</p></div>
            <div><p className="font-display text-4xl">{donations.length}</p><p className="text-sm opacity-75">Doações</p></div>
            <div><p className="font-display text-4xl">{donations.length * POINTS_PER_DONATION}</p><p className="text-sm opacity-75">Pontos</p></div>
            <div><p className="font-display text-4xl">{donations.length * 3}</p><p className="text-sm opacity-75">Vidas ajudadas</p></div>
          </div>
          {!bt && <p className="mt-4 text-sm"><Link to="/perfil" className="underline">Adicione o seu tipo sanguíneo</Link> ao perfil.</p>}
        </div>

        <div className="panel p-6">
          <CalendarClock className="h-6 w-6 text-primary" />
          <h3 className="mt-3 text-xl">Próxima doação</h3>
          {canDonate ? (
            <p className="mt-1 text-muted-foreground">Já pode doar! Agende quando lhe for conveniente.</p>
          ) : (
            <p className="mt-1 text-muted-foreground">Poderá doar novamente a partir de <strong className="text-foreground">{fmtDate(next!)}</strong>.</p>
          )}
          <Button asChild className="mt-4 w-full"><Link to="/agendar">Agendar doação</Link></Button>
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <section className="panel p-6">
          <h2 className="flex items-center gap-2 text-xl"><Bell className="h-5 w-5 text-primary" /> Notificações</h2>
          <ul className="mt-4 space-y-3">
            {alerts.length === 0 && <li className="text-sm text-muted-foreground">Sem alertas de momento.</li>}
            {alerts.map((c) => (
              <li key={c.id} className={`rounded-xl p-4 ${c.urgency === "critica" ? "bg-accent" : "bg-muted"}`}>
                <div className="flex items-center gap-2">
                  {c.urgency !== "normal" && <AlertTriangle className="h-4 w-4 text-primary" />}
                  <span className="font-semibold">{c.title}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{URGENCY_LABEL[c.urgency]}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
              </li>
            ))}
            {data?.upcoming.map((a) => (
              <li key={a.id} className="rounded-xl bg-muted p-4 text-sm">
                <span className="font-semibold">Lembrete:</span> doação em {a.centers?.name} — {fmtDate(a.scheduled_at, true)}
              </li>
            ))}
          </ul>
        </section>

        <section className="panel p-6">
          <h2 className="text-xl">Últimas doações</h2>
          <ul className="mt-4 divide-y">
            {donations.length === 0 && <li className="text-sm text-muted-foreground">Ainda não registou doações. A primeira é a mais especial!</li>}
            {donations.slice(0, 5).map((d) => (
              <li key={d.id} className="flex justify-between py-3 text-sm">
                <span>{fmtDate(d.donated_at)}</span>
                <span className="text-muted-foreground">{d.volume_ml} ml · +{POINTS_PER_DONATION} pts</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
