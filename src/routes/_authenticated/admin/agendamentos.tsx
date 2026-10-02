import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminOnly, PageHeader } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/lib/blood";

export const Route = createFileRoute("/_authenticated/admin/agendamentos")({
  head: () => ({ meta: [{ title: "Agendamentos — Gestão Gota Viva" }] }),
  component: Agendamentos,
});

const STATUS: Record<string, string> = { agendado: "Agendado", concluido: "Concluído", cancelado: "Cancelado" };

function Agendamentos() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-appts"],
    queryFn: async () => {
      const a = await supabase.from("appointments").select("*, centers(name, city)").order("scheduled_at", { ascending: false }).limit(100);
      const ids = [...new Set((a.data ?? []).map((x) => x.donor_id))];
      const p = ids.length ? await supabase.from("profiles").select("id, full_name, blood_type").in("id", ids) : { data: [] };
      const names = new Map((p.data ?? []).map((x) => [x.id, x]));
      return (a.data ?? []).map((x) => ({ ...x, donor: names.get(x.donor_id) }));
    },
  });

  async function complete(id: string) {
    const { error } = await supabase.rpc("complete_appointment", { _appointment_id: id });
    if (error) { toast.error(error.message.includes("tipo sanguíneo") ? "O doador não tem tipo sanguíneo registado." : "Não foi possível concluir."); return; }
    toast.success("Doação registada e estoque atualizado.");
    qc.invalidateQueries();
  }

  async function cancel(id: string) {
    await supabase.from("appointments").update({ status: "cancelado" }).eq("id", id);
    toast.success("Agendamento cancelado.");
    qc.invalidateQueries({ queryKey: ["admin-appts"] });
  }

  return (
    <AdminOnly>
      <PageHeader title="Agendamentos" subtitle="Confirme doações realizadas para atualizar o estoque." />
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-4 font-medium">Doador</th><th className="p-4 font-medium">Tipo</th>
              <th className="p-4 font-medium">Centro</th><th className="p-4 font-medium">Data</th>
              <th className="p-4 font-medium">Estado</th><th className="p-4 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((a) => (
              <tr key={a.id} className="border-b last:border-0">
                <td className="p-4 font-medium">{a.donor?.full_name || "—"}</td>
                <td className="p-4">{a.donor?.blood_type ?? "—"}</td>
                <td className="p-4">{a.centers?.name}</td>
                <td className="p-4">{fmtDate(a.scheduled_at, true)}</td>
                <td className="p-4"><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{STATUS[a.status]}</span></td>
                <td className="p-4">
                  {a.status === "agendado" && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => complete(a.id)}>Concluir doação</Button>
                      <Button size="sm" variant="ghost" onClick={() => cancel(a.id)}>Cancelar</Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(data ?? []).length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Sem agendamentos.</p>}
      </div>
    </AdminOnly>
  );
}
