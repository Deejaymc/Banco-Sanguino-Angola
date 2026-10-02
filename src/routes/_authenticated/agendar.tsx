import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/agendar")({
  head: () => ({ meta: [{ title: "Agendar doação — Gota Viva" }] }),
  component: Agendar,
});

const TIMES = ["08:00", "09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00"];

function Agendar() {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: centers } = useQuery({
    queryKey: ["centers"],
    queryFn: async () => (await supabase.from("centers").select("*").order("city")).data ?? [],
  });
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [centerId, setCenterId] = useState("");
  const [date, setDate] = useState(tomorrow);
  const [time, setTime] = useState("09:00");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!me || !centerId) { toast.error("Escolha um centro de colheita."); return; }
    setSaving(true);
    const { error } = await supabase.from("appointments").insert({
      donor_id: me.user.id,
      center_id: centerId,
      scheduled_at: new Date(`${date}T${time}:00`).toISOString(),
    });
    setSaving(false);
    if (error) { toast.error("Não foi possível agendar."); return; }
    toast.success("Doação agendada! O centro foi notificado.");
    qc.invalidateQueries();
    navigate({ to: "/historico" });
  }

  return (
    <div>
      <PageHeader title="Agendar doação" subtitle="Escolha o local, a data e a hora." />
      <form onSubmit={submit} className="panel max-w-2xl space-y-6 p-6">
        <div>
          <Label>Centro de colheita</Label>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {(centers ?? []).map((c) => (
              <button type="button" key={c.id} onClick={() => setCenterId(c.id)}
                className={`rounded-xl border p-4 text-left transition-colors ${centerId === c.id ? "border-primary bg-accent" : "hover:bg-muted"}`}>
                <p className="font-semibold">{c.name}</p>
                <p className="text-sm text-muted-foreground">{c.city} · {c.hours}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>Data</Label><input type="date" className="field mt-2" min={tomorrow} value={date} onChange={(e) => setDate(e.target.value)} required /></div>
          <div>
            <Label>Hora</Label>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {TIMES.map((t) => (
                <button type="button" key={t} onClick={() => setTime(t)}
                  className={`rounded-md border py-2 text-sm ${time === t ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{t}</button>
              ))}
            </div>
          </div>
        </div>
        <Button type="submit" size="lg" disabled={saving}>Confirmar agendamento</Button>
      </form>
    </div>
  );
}
