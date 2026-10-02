import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminOnly, PageHeader } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { URGENCY_LABEL, fmtDate } from "@/lib/blood";

export const Route = createFileRoute("/_authenticated/admin/pedidos")({
  head: () => ({ meta: [{ title: "Pedidos hospitalares — Gestão Gota Viva" }] }),
  component: Pedidos,
});

const STATUS: Record<string, string> = { pendente: "Pendente", atendido: "Atendido", recusado: "Recusado" };

function Pedidos() {
  const qc = useQueryClient();
  const { data: requests } = useQuery({
    queryKey: ["admin-requests"],
    queryFn: async () => (await supabase.from("hospital_requests").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  async function resolve(id: string, approve: boolean) {
    const { error } = await supabase.rpc("resolve_request", { _request_id: id, _approve: approve });
    if (error) { toast.error(error.message.includes("Estoque") ? "Estoque insuficiente para atender este pedido." : "Não foi possível processar."); return; }
    toast.success(approve ? "Pedido atendido — estoque atualizado." : "Pedido recusado.");
    qc.invalidateQueries();
  }

  return (
    <AdminOnly>
      <PageHeader title="Pedidos hospitalares" subtitle="Aprove ou recuse solicitações de unidades de sangue." />
      <ul className="space-y-3">
        {(requests ?? []).map((r) => (
          <li key={r.id} className="panel flex flex-wrap items-center gap-4 p-5">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{r.hospital_name}</span>
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">{r.blood_type} × {r.units}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{URGENCY_LABEL[r.urgency]}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{STATUS[r.status]}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{fmtDate(r.created_at, true)}{r.notes ? ` · ${r.notes}` : ""}</p>
            </div>
            {r.status === "pendente" && (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => resolve(r.id, true)}>Atender</Button>
                <Button size="sm" variant="outline" onClick={() => resolve(r.id, false)}>Recusar</Button>
              </div>
            )}
          </li>
        ))}
        {(requests ?? []).length === 0 && <li className="panel p-6 text-center text-sm text-muted-foreground">Sem pedidos de momento.</li>}
      </ul>
    </AdminOnly>
  );
}
