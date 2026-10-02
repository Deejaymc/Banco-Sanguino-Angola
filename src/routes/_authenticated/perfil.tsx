import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BLOOD_TYPES } from "@/lib/blood";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({ meta: [{ title: "Perfil — Gota Viva" }] }),
  component: Perfil,
});

function Perfil() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [f, setF] = useState({ full_name: "", phone: "", blood_type: "", birth_date: "", city: "" });
  const { data: adminExists } = useQuery({
    queryKey: ["admin-exists"],
    queryFn: async () => (await supabase.rpc("admin_exists")).data ?? true,
  });

  useEffect(() => {
    const p = me?.profile;
    if (p) setF({ full_name: p.full_name ?? "", phone: p.phone ?? "", blood_type: p.blood_type ?? "", birth_date: p.birth_date ?? "", city: p.city ?? "" });
  }, [me?.profile]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    const { error } = await supabase.from("profiles").update({
      full_name: f.full_name, phone: f.phone || null, blood_type: f.blood_type || null,
      birth_date: f.birth_date || null, city: f.city || null,
    }).eq("id", me.user.id);
    if (error) return toast.error("Não foi possível guardar.");
    toast.success("Perfil atualizado.");
    qc.invalidateQueries({ queryKey: ["me"] });
  }

  async function claimAdmin() {
    const { data } = await supabase.rpc("claim_first_admin");
    if (data) { toast.success("Agora é administrador do portal."); qc.invalidateQueries(); }
    else toast.error("Já existe um administrador.");
  }

  return (
    <div>
      <PageHeader title="Perfil" subtitle={me?.user.email ?? ""} />
      <form onSubmit={save} className="panel max-w-2xl space-y-4 p-6">
        <div><Label>Nome completo</Label><Input value={f.full_name} onChange={set("full_name")} required /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>Telefone</Label><Input value={f.phone} onChange={set("phone")} /></div>
          <div><Label>Cidade</Label><Input value={f.city} onChange={set("city")} /></div>
          <div><Label>Data de nascimento</Label><input type="date" className="field" value={f.birth_date} onChange={set("birth_date")} /></div>
          <div>
            <Label>Tipo sanguíneo</Label>
            <select className="field" value={f.blood_type} onChange={set("blood_type")}>
              <option value="">Não sei</option>
              {BLOOD_TYPES.map((b) => <option key={b}>{b}</option>)}
            </select>
          </div>
        </div>
        <Button type="submit">Guardar</Button>
      </form>

      {adminExists === false && (
        <div className="panel mt-6 max-w-2xl p-6">
          <h3 className="text-xl">Configurar o portal de gestão</h3>
          <p className="mt-1 text-sm text-muted-foreground">Ainda não existe nenhum administrador. A primeira pessoa a ativar torna-se gestora do banco de sangue.</p>
          <Button className="mt-4" variant="outline" onClick={claimAdmin}>Tornar-me administrador</Button>
        </div>
      )}
    </div>
  );
}
