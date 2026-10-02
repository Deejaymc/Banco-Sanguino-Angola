import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Megaphone } from "lucide-react";
import { toast } from "sonner";
import { AdminOnly, PageHeader } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BLOOD_TYPES, URGENCY_LABEL } from "@/lib/blood";

export const Route = createFileRoute("/_authenticated/admin/campanhas")({
  head: () => ({ meta: [{ title: "Campanhas — Gestão Gota Viva" }] }),
  component: Campanhas,
});

function Campanhas() {
  const qc = useQueryClient();
  const [f, setF] = useState({ title: "", description: "", blood_type: "", urgency: "normal" });
  const { data: campaigns } = useQuery({
    queryKey: ["admin-campaigns"],
    queryFn: async () => (await supabase.from("campaigns").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("campaigns").insert({
      title: f.title, description: f.description, blood_type: f.blood_type || null, urgency: f.urgency,
    });
    if (error) { toast.error("Não foi possível criar a campanha."); return; }
    toast.success("Campanha publicada.");
    setF({ title: "", description: "", blood_type: "", urgency: "normal" });
    qc.invalidateQueries({ queryKey: ["admin-campaigns"] });
  }

  async function toggle(id: string, active: boolean) {
    await supabase.from("campaigns").update({ active: !active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-campaigns"] });
  }

  return (
    <AdminOnly>
      <PageHeader title="Campanhas" subtitle="Crie alertas e campanhas de urgência para os doadores." />
      <form onSubmit={create} className="panel mb-8 space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-1"><Label>Título</Label><Input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div>
            <Label>Tipo sanguíneo</Label>
            <select className="field" value={f.blood_type} onChange={(e) => setF({ ...f, blood_type: e.target.value })}>
              <option value="">Todos</option>
              {BLOOD_TYPES.map((b) => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <Label>Urgência</Label>
            <select className="field" value={f.urgency} onChange={(e) => setF({ ...f, urgency: e.target.value })}>
              <option value="normal">Normal</option><option value="alta">Alta</option><option value="critica">Crítica</option>
            </select>
          </div>
        </div>
        <div><Label>Descrição</Label><Input required value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <Button type="submit"><Megaphone className="mr-2 h-4 w-4" />Publicar campanha</Button>
      </form>

      <ul className="space-y-3">
        {(campaigns ?? []).map((c) => (
          <li key={c.id} className={`panel flex flex-wrap items-center gap-4 p-5 ${!c.active ? "opacity-60" : ""}`}>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{c.title}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{URGENCY_LABEL[c.urgency]}</span>
                {c.blood_type && <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">{c.blood_type}</span>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => toggle(c.id, c.active)}>{c.active ? "Desativar" : "Reativar"}</Button>
          </li>
        ))}
      </ul>
    </AdminOnly>
  );
}
