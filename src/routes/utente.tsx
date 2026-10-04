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
      { name: "description", content: "Pesquise a disponibilidade de sangue por tipo sanguíneo e encontre a unidade ou centro hospitalar mais próximo na rede Gota Viva." },
      { property: "og:title", content: "Procurar sangue — Gota Viva" },
      { property: "og:description", content: "Encontre o tipo sanguíneo que procura e o centro ou hospital mais próximo." },
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

  const selected = useMemo(
    () => (inventory ?? []).find((i) => i.blood_type === bloodType) ?? null,
    [inventory, bloodType],
  );

  const filteredCenters = useMemo(() => {
    const t = term.trim().toLowerCase();
    return (centers ?? []).filter(
      (c) => !t || c.name.toLowerCase().includes(t) || (c.city ?? "").toLowerCase().includes(t),
    );
  }, [centers, term]);

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
          Escolha o tipo sanguíneo para ver a disponibilidade na rede e pesquise a unidade ou centro hospitalar mais próximo.
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          {BLOOD_TYPES.map((b) => (
            <Button key={b} size="sm" variant={bloodType === b ? "default" : "outline"} onClick={() => setBloodType(bloodType === b ? null : b)}>{b}</Button>
          ))}
        </div>

        {selected && (() => {
          const s = stockLevel(selected.units, selected.min_units);
          return (
            <div className={`mt-6 rounded-2xl p-6 ${s.tone}`}>
              <p className="text-sm uppercase tracking-wider opacity-80">Disponibilidade na rede</p>
              <p className="mt-1 text-3xl font-bold">{selected.blood_type} — {selected.units} unidades</p>
              <p className="mt-1 text-sm font-medium">Nível: {s.label}</p>
              {s.label !== "Adequado" && (
                <p className="mt-3 text-sm opacity-90">
                  Este tipo está em falta. Se puder doar, a sua ajuda faz diferença agora.
                </p>
              )}
            </div>
          );
        })()}

        {!bloodType && (
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(inventory ?? []).map((i) => {
              const s = stockLevel(i.units, i.min_units);
              return (
                <button
                  key={i.blood_type}
                  onClick={() => setBloodType(i.blood_type)}
                  className={`rounded-lg px-3 py-2.5 text-center transition-transform hover:scale-[1.03] ${s.tone}`}
                >
                  <p className="text-lg font-bold">{i.blood_type}</p>
                  <p className="text-xs font-medium">{i.units} unidades · {s.label}</p>
                </button>
              );
            })}
          </div>
        )}

        <h2 className="mt-12 text-2xl font-semibold">Unidades e centros hospitalares</h2>
        <div className="relative mt-4 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Pesquisar por nome ou cidade…"
            className="pl-9"
          />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {filteredCenters.length === 0 && (
            <p className="col-span-full rounded-xl border border-dashed p-8 text-center text-muted-foreground">
              Nenhuma unidade encontrada com esse nome.
            </p>
          )}
          {filteredCenters.map((c) => (
            <div key={c.id} className="panel p-5">
              <h3 className="text-lg font-semibold">{c.name}</h3>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />{c.address}{c.city ? `, ${c.city}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                {c.phone && <span className="flex items-center gap-1.5"><Phone className="h-4 w-4" />{c.phone}</span>}
                {c.hours && <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{c.hours}</span>}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Em caso de urgência, contacte diretamente a unidade mais próxima. Os níveis são atualizados automaticamente.
        </p>
      </main>
    </div>
  );
}
