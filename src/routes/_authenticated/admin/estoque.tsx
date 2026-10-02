import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { AdminOnly, PageHeader } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { stockLevel, fmtDate } from "@/lib/blood";

export const Route = createFileRoute("/_authenticated/admin/estoque")({
  head: () => ({ meta: [{ title: "Estoque — Gestão Gota Viva" }] }),
  component: Estoque,
});

function Estoque() {
  const qc = useQueryClient();
  const { data: inv } = useQuery({
    queryKey: ["admin-inventory"],
    queryFn: async () => (await supabase.from("inventory").select("*").order("blood_type")).data ?? [],
  });

  async function adjust(bloodType: string, units: number, delta: number) {
    const next = units + delta;
    if (next < 0) return;
    const { error } = await supabase.from("inventory").update({ units: next, updated_at: new Date().toISOString() }).eq("blood_type", bloodType);
    if (error) { toast.error("Não foi possível atualizar."); return; }
    qc.invalidateQueries({ queryKey: ["admin-inventory"] });
  }

  return (
    <AdminOnly>
      <PageHeader title="Estoque" subtitle="Unidades de sangue disponíveis por tipo." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(inv ?? []).map((i) => {
          const s = stockLevel(i.units, i.min_units);
          return (
            <div key={i.blood_type} className="panel p-5">
              <div className="flex items-center justify-between">
                <span className="font-display text-3xl font-semibold">{i.blood_type}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.tone}`}>{s.label}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Mínimo recomendado: {i.min_units}</p>
              <div className="mt-4 flex items-center justify-between">
                <button onClick={() => adjust(i.blood_type, i.units, -1)} className="rounded-lg border p-2 hover:bg-muted" aria-label="Remover unidade"><Minus className="h-4 w-4" /></button>
                <span className="font-display text-4xl font-semibold text-primary">{i.units}</span>
                <button onClick={() => adjust(i.blood_type, i.units, 1)} className="rounded-lg border p-2 hover:bg-muted" aria-label="Adicionar unidade"><Plus className="h-4 w-4" /></button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Atualizado {fmtDate(i.updated_at, true)}</p>
            </div>
          );
        })}
      </div>
    </AdminOnly>
  );
}
