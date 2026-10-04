import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Droplet, CalendarPlus, Bell, Wallet, MapPin, Hospital, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { stockLevel } from "@/lib/blood";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gota Viva — Doe sangue, salve vidas" },
      { name: "description", content: "Registe-se como doador, agende doações, receba alertas de campanhas e acompanhe o seu impacto." },
      { property: "og:title", content: "Gota Viva — Doe sangue, salve vidas" },
      { property: "og:description", content: "Banco de sangue digital para doadores, centros de colheita e hospitais." },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: inventory } = useQuery({
    queryKey: ["inventory-public"],
    queryFn: async () => (await supabase.from("inventory").select("*").order("blood_type")).data ?? [],
  });

  const features = [
    { icon: CalendarPlus, t: "Agende em segundos", d: "Escolha o centro, o dia e a hora." },
    { icon: Bell, t: "Alertas urgentes", d: "Saiba quando o seu tipo sanguíneo é mais necessário." },
    { icon: Wallet, t: "Carteira digital", d: "Histórico, pontos e a sua próxima data de doação." },
    { icon: MapPin, t: "Centros próximos", d: "Endereços, horários e contactos dos postos." },
    { icon: BarChart3, t: "Gestão de estoque", d: "Níveis por tipo sanguíneo em tempo real." },
    { icon: Hospital, t: "Hospitais ligados", d: "Pedidos de unidades diretamente ao banco." },
  ];

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-primary">
          <Droplet className="h-6 w-6 fill-current" />
          <span className="font-display text-xl font-semibold text-foreground">Gota Viva</span>
        </div>
        <Button asChild variant="ghost"><Link to="/auth">Entrar</Link></Button>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 pb-16 pt-6 md:grid-cols-2">
        <div>
          <p className="mb-4 inline-flex rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">Cada doação pode salvar até 3 vidas</p>
          <h1 className="text-5xl font-semibold leading-[1.05] md:text-6xl">
            Uma gota sua.<br /><span className="text-primary italic">Uma vida inteira</span> para alguém.
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">
            Registe-se, agende a sua doação e acompanhe o impacto que faz — enquanto centros e hospitais gerem o estoque com transparência.
          </p>
          <div className="mt-8">
            <Button asChild size="lg"><Link to="/auth">Quero ser doador</Link></Button>
          </div>
        </div>
        <div className="relative">
          <img src={hero} alt="Braço com penso após doação de sangue, segurando um coração de papel" width={1200} height={1408} className="aspect-[4/5] w-full rounded-3xl object-cover shadow-soft" />
          <div className="panel absolute -bottom-6 -left-4 w-56 p-4 md:-left-10">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Estoque agora</p>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {(inventory ?? []).map((i) => {
                const s = stockLevel(i.units, i.min_units);
                return (
                  <div key={i.blood_type} className={`rounded-md px-1 py-1.5 text-center text-xs font-bold ${s.tone}`}>{i.blood_type}</div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-hero text-primary-foreground">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.t}>
              <f.icon className="h-6 w-6" />
              <h3 className="mt-3 text-xl">{f.t}</h3>
              <p className="mt-1 text-primary-foreground/75">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-3xl font-semibold">Como funciona</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-5">
          {["Regista-se no app", "Os dados são validados", "Agenda a doação", "Doa e o estoque é atualizado", "Hospitais pedem unidades"].map((s, i) => (
            <li key={s} className="panel p-5">
              <span className="font-display text-3xl text-primary">{i + 1}</span>
              <p className="mt-2 font-medium">{s}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">Gota Viva · Banco de Sangue</footer>
    </div>
  );
}
