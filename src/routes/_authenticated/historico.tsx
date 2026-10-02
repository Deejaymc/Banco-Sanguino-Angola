import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Award } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { POINTS_PER_DONATION, fmtDate } from "@/lib/blood";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({ meta: [{ title: "Carteira e histórico — Gota Viva" }] }),
  component: Historico,
});

const STATUS: Record<string, string> = { agendado: "Agendado", concluido: "Concluído", cancelado: "Cancelado" };

function Historico() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const uid = me?.user.id;
  const { data } = useQuery({
    queryKey: ["historico", uid],
    enabled: !!uid,
    queryFn: async () => {
      const [d, a] = await Promise.all([
        supabase.from("donations").select("*, centers(name)").eq("donor_id", uid!).order("donated_at", { ascending: false }),
        supabase.from("appointments").select("*, centers(name, city)").eq("donor_id", uid!).order("scheduled_at", { ascending: false }),
      ]);
      return { donations: d.data ?? [], appts: a.data ?? [] };
    },
  });

  async function cancel(id: string) {
    const { error } = await supabase.from("appointments").update({ status: "cancelado" }).eq("id", id);
    if (error) { toast.error("Não foi possível cancelar."); return; }
    toast.success("Agendamento cancelado.");
    qc.invalidateQueries();
  }

  const donations = data?.donations ?? [];
  const milestones = [1, 5, 10, 25];

  return (
    <div>
      <PageHeader title="Carteira e histórico" subtitle="Todas as suas doações, certificados e agendamentos." />

      <section className="panel mb-6 p-6">
        <h2 className="text-xl">Certificados</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {milestones.map((m) => {
            const got = donations.length >= m;
            return (
              <div key={m} className={`rounded-xl p-4 text-center ${got ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground opacity-60"}`}>
                <Award className="mx-auto h-8 w-8" />
                <p className="mt-2 font-semibold">{m} {m === 1 ? "doação" : "doações"}</p>
                <p className="text-xs">{got ? "Conquistado" : `Faltam ${m - donations.length}`}</p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel p-6">
          <h2 className="text-xl">Doações</h2>
          <ul className="mt-4 divide-y">
            {donations.length === 0 && <li className="py-2 text-sm text-muted-foreground">Sem doações registadas.</li>}
            {donations.map((d) => (
              <li key={d.id} className="flex justify-between py-3 text-sm">
                <div><p className="font-medium">{fmtDate(d.donated_at)}</p><p className="text-muted-foreground">{d.centers?.name}</p></div>
                <div className="text-right"><p>{d.blood_type} · {d.volume_ml} ml</p><p className="text-primary">+{POINTS_PER_DONATION} pts</p></div>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel p-6">
          <h2 className="text-xl">Agendamentos</h2>
          <ul className="mt-4 divide-y">
            {(data?.appts ?? []).length === 0 && <li className="py-2 text-sm text-muted-foreground">Sem agendamentos.</li>}
            {data?.appts.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div><p className="font-medium">{fmtDate(a.scheduled_at, true)}</p><p className="text-muted-foreground">{a.centers?.name}</p></div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{STATUS[a.status]}</span>
                  {a.status === "agendado" && <Button size="sm" variant="ghost" onClick={() => cancel(a.id)}>Cancelar</Button>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
