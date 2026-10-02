import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AdminOnly, PageHeader } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { fmtDate } from "@/lib/blood";

export const Route = createFileRoute("/_authenticated/admin/doadores")({
  head: () => ({ meta: [{ title: "Doadores — Gestão Gota Viva" }] }),
  component: Doadores,
});

function Doadores() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["admin-doadores"],
    queryFn: async () => {
      const [p, r, d] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("donations").select("donor_id"),
      ]);
      const counts = new Map<string, number>();
      (d.data ?? []).forEach((x) => counts.set(x.donor_id, (counts.get(x.donor_id) ?? 0) + 1));
      const roles = new Map<string, string[]>();
      (r.data ?? []).forEach((x) => roles.set(x.user_id, [...(roles.get(x.user_id) ?? []), x.role]));
      return (p.data ?? []).map((prof) => ({ ...prof, roles: roles.get(prof.id) ?? [], donations: counts.get(prof.id) ?? 0 }));
    },
  });

  async function toggleRole(userId: string, role: "admin" | "hospital", grant: boolean) {
    const { error } = await supabase.rpc("set_user_role", { _user_id: userId, _role: role, _grant: grant });
    if (error) { toast.error("Não foi possível alterar o papel."); return; }
    toast.success("Papel atualizado.");
    qc.invalidateQueries({ queryKey: ["admin-doadores"] });
  }

  const list = (data ?? []).filter((p) => `${p.full_name} ${p.city ?? ""} ${p.blood_type ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <AdminOnly>
      <PageHeader title="Doadores" subtitle="Cadastros, frequência de doações e papéis de acesso." />
      <Input placeholder="Procurar por nome, cidade ou tipo…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-6 max-w-md" />
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-4 font-medium">Nome</th><th className="p-4 font-medium">Tipo</th>
              <th className="p-4 font-medium">Cidade</th><th className="p-4 font-medium">Doações</th>
              <th className="p-4 font-medium">Desde</th><th className="p-4 font-medium">Papéis</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="p-4 font-medium">{p.full_name || "—"}</td>
                <td className="p-4">{p.blood_type ?? "—"}</td>
                <td className="p-4">{p.city ?? "—"}</td>
                <td className="p-4">{p.donations}</td>
                <td className="p-4">{fmtDate(p.created_at)}</td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1.5">
                    {(["admin", "hospital"] as const).map((role) => {
                      const has = p.roles.includes(role);
                      return (
                        <button key={role} onClick={() => toggleRole(p.id, role, !has)}
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${has ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                          {role === "admin" ? "Gestor" : "Hospital"}
                        </button>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Nenhum doador encontrado.</p>}
      </div>
    </AdminOnly>
  );
}
