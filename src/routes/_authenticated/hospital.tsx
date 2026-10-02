import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BLOOD_TYPES, URGENCY_LABEL, fmtDate, stockLevel } from "@/lib/blood";

export const Route = createFileRoute("/_authenticated/hospital")({
  head: () => ({ meta: [{ title: "Hospital — Gota Viva" }] }),
  component: HospitalPage,
});

const STATUS: Record<string, string> = { pendente: "Pendente", atendido: "Atendido", recusado: "Recusado" };

function HospitalPage() {
  const { data: me, isLoading } = useMe();
  const qc = useQueryClient();
  const [f, setF] = useState({ hospital_name: "", blood_type: "O-", units: "1", urgency: "normal", notes: "" });

  const { data } = useQuery({
    queryKey: ["hospital", me?.user.id],
    enabled: !!me?.isHospital,
    queryFn: async () => {
      const [inv, req] = await Promise.all([
        supabase.from("inventory").select("*").order("blood_type"),
        supabase.from("hospital_requests").select("*").eq("hospital_id", me!.user.id).order("created_at", { ascending: false }),
      ]);
      return { inventory: inv.data ?? [], requests: req.data ?? [] };
    },
  });

  if (isLoading) return <p className="text-muted-foreground">A carregar…</p>;
  if (!me?.isHospital)
    return <div className="panel p-8 text-center"><h2 className="text-2xl">Acesso restrito</h2><p className="mt-2 text-muted-foreground">Esta área é exclusiva para hospitais. Peça a um gestor para ativar o acesso.</p></div>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("hospital_requests").insert({
      hospital_id: me!.user.id,
      hospital_name: f.hospital_name,
      blood_type: f.blood_type,
      units: parseInt(f.units, 10),
      urgency: f.urgency,
      notes: f.notes || null,
    });
    if (error) { toast.error("Não foi possível enviar o pedido."); return; }
    toast.success("Pedido enviado ao banco de sangue.");
    setF({ ...f, units: "1", notes: "" });
    qc.invalidateQueries({ queryKey: ["hospital"] });
  }

  return (
    <div>
      <PageHeader title="Portal do hospital" subtitle="Consulte a disponibilidade e solicite unidades de sangue." />

      <section className="panel mb-8 p-6">
        <h2 className="text-xl">Disponibilidade atual</h2>
        <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-8">
          {(data?.inventory ?? []).map((i) => {
            const s = stockLevel(i.units, i.min_units);
            return (
              <div key={i.blood_type} className="rounded-xl border p-3 text-center">
                <p className="font-display text-xl font-semibold">{i.blood_type}</p>
                <p className="text-lg font-bold text-primary">{i.units}</p>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.tone}`}>{s.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={submit} className="panel space-y-4 p-6">
          <h2 className="text-xl">Novo pedido</h2>
          <div><Label>Nome do hospital</Label><Input required value={f.hospital_name} onChange={(e) => setF({ ...f, hospital_name: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Tipo</Label>
              <select className="field" value={f.blood_type} onChange={(e) => setF({ ...f, blood_type: e.target.value })}>
                {BLOOD_TYPES.map((b) => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div><Label>Unidades</Label><Input type="number" min={1} required value={f.units} onChange={(e) => setF({ ...f, units: e.target.value })} /></div>
            <div>
              <Label>Urgência</Label>
              <select className="field" value={f.urgency} onChange={(e) => setF({ ...f, urgency: e.target.value })}>
                <option value="normal">Normal</option><option value="alta">Alta</option><option value="critica">Crítica</option>
              </select>
            </div>
          </div>
          <div><Label>Notas (opcional)</Label><Input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
          <Button type="submit">Enviar pedido</Button>
        </form>

        <section className="panel p-6">
          <h2 className="text-xl">Os meus pedidos</h2>
          <ul className="mt-4 divide-y">
            {(data?.requests ?? []).length === 0 && <li className="py-2 text-sm text-muted-foreground">Ainda não fez pedidos.</li>}
            {data?.requests.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-3 text-sm">
                <div><p className="font-medium">{r.blood_type} × {r.units} · {URGENCY_LABEL[r.urgency]}</p><p className="text-muted-foreground">{fmtDate(r.created_at, true)}</p></div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{STATUS[r.status]}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
