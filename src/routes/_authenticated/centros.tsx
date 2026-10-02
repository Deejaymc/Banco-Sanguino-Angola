import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Clock, MapPin, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/centros")({
  head: () => ({ meta: [{ title: "Centros de colheita — Gota Viva" }] }),
  component: Centros,
});

function Centros() {
  const [q, setQ] = useState("");
  const { data: centers } = useQuery({
    queryKey: ["centers"],
    queryFn: async () => (await supabase.from("centers").select("*").order("city")).data ?? [],
  });
  const list = (centers ?? []).filter((c) => `${c.name} ${c.city} ${c.address}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader title="Centros de colheita" subtitle="Encontre o posto mais perto de si." />
      <Input placeholder="Procurar por cidade ou nome…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-6 max-w-md" />
      <div className="grid gap-4 md:grid-cols-2">
        {list.map((c) => (
          <div key={c.id} className="panel p-6">
            <p className="text-xs uppercase tracking-wider text-primary">{c.city}</p>
            <h3 className="mt-1 text-xl">{c.name}</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              <li className="flex gap-2"><MapPin className="h-4 w-4 shrink-0" />{c.address}</li>
              {c.hours && <li className="flex gap-2"><Clock className="h-4 w-4 shrink-0" />{c.hours}</li>}
              {c.phone && <li className="flex gap-2"><Phone className="h-4 w-4 shrink-0" />{c.phone}</li>}
            </ul>
            <Button asChild size="sm" className="mt-4"><Link to="/agendar">Agendar aqui</Link></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
