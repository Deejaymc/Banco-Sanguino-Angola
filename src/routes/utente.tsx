import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Droplet, Search, MapPin, Phone, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { BLOOD_TYPES, stockLevel } from "@/lib/blood";

export const Route = createFileRoute("/utente")({
  head: () => ({
    meta: [
      { title: "Procurar sangue — Gota Viva" },
      { name: "description", content: "Pesquise a disponibilidade de sangue por tipo sanguíneo nos centros e unidades hospitalares da rede Gota Viva." },
      { property: "og:title", content: "Procurar sangue — Gota Viva" },
      { property: "og:description", content: "Encontre o tipo sanguíneo que procura num centro ou hospital da rede." },
    ],
  }),
  component: UtentePage,
});

function UtentePage() {
  const [bloodType, setBloodType] = useState<string | null>(null);
  const [term, setTerm] = useState("");

  const { data: inventory } = useQuery({
    queryKey: ["utente-inventory"],
    queryFn: async () => (await supabase.from("inventory").select("*")).data ?? [],
    refetchInterval: 60_000,
  });
  const { data: centers } = useQuery({
    queryKey: ["utente-centers"],
    queryFn: async () => (await supabase.from("centers").select("*").order("name")).data ?? [],
  });

  const results = useMemo(() => {
    const t = term.trim().toLowerCase();
    return (centers ?? [])
      .filter((c) => !t || c.name.toLowerCase().includes(t) || (c.city ?? "").toLowerCase().includes(t))
      .map((c) => {
        const rows = (inventory ?? []).filter((i) => i.center_id === c.id && (!bloodType || i.blood_type === bloodType));
        return { center: c, rows };
      })
      .filter((r) => r.rows.length > 0 || !bloodType);
  }, [centers, inventory, bloodType, term]);

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-primary">
          <Droplet className="h-6 w-6 fill-current" />
          <span className="font-display text-xl font-semibold text-foreground">Gota Viva</span>
        </div>
        <Button asChild variant="ghost"><Link to="/"><ArrowLeft className="mr-1 h-4 w-4" />Voltar</Link></Button>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-20">
        <h1 className="text-4xl font-semibold md:text-5xl">Procurar <span className="text-primary italic">sangue disponível</span></h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Escolha o tipo sanguíneo e pesquise a unidade ou centro hospitalar para ver a disponibilidade em tempo real.
        </p>

        <div className="mt-8 flex flex-col gap-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Pesquisar unidade ou centro hospitalar…"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={bloodType === null ? "default" : "outline"} onClick={() => setBloodType(null)}>Todos</Button>
            {BLOOD_TYPES.map((b) => (
              <Button key={b} size="sm" variant={bloodType === b ? "default" : "outline"} onClick={() => setBloodType(b)}>{b}</Button>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-5">
          {results.length === 0 && (
            <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
              Nenhum centro encontrado com esses critérios.
            </p>
          )}
          {results.map(({ center, rows }) => (
            <div key={center.id} className="panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{center.name}</h2>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />{center.address}{center.city ? `, ${center.city}` : ""}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {center.phone && <span className="flex items-center gap-1.5"><Phone className="h-4 w-4" />{center.phone}</span>}
                    {center.hours && <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{center.hours}</span>}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {rows.map((i) => {
                  const s = stockLevel(i.units, i.min_units);
                  return (
                    <div key={i.blood_type} className={`rounded-lg px-3 py-2.5 text-center ${s.tone}`}>
                      <p className="text-lg font-bold">{i.blood_type}</p>
                      <p className="text-xs font-medium">{i.units} unidades · {s.label}</p>
                    </div>
                  );
                })}
                {rows.length === 0 && (
                  <p className="col-span-full text-sm text-muted-foreground">Sem informação de estoque para este centro.</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Em caso de urgência, contacte diretamente o centro mais próximo. Os níveis são atualizados automaticamente.
        </p>
      </main>
    </div>
  );
}
