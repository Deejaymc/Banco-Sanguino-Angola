import { useQuery } from "@tanstack/react-query";
import { Building2, Droplet, HeartPulse, Hospital, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BLOOD_TYPES, stockLevel } from "@/lib/blood";

type Stats = {
  donors: number;
  donations: number;
  volume_ml: number;
  donations_month: number;
  hospitals: number;
  requests_total: number;
  requests_done: number;
  units_delivered: number;
  centers: number;
  donors_by_type: Record<string, number>;
  stock: { blood_type: string; units: number; min_units: number }[];
};

export function CommunityStats() {
  const { data: s } = useQuery({
    queryKey: ["community-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("community_stats");
      if (error) throw error;
      return data as unknown as Stats;
    },
    refetchInterval: 60_000,
  });

  const kpis = [
    { label: "Doadores", value: s?.donors, icon: Users },
    { label: "Doações", value: s?.donations, icon: Droplet, hint: `${s?.donations_month ?? 0} este mês` },
    { label: "Utentes ajudados", value: s ? s.donations * 3 : undefined, icon: HeartPulse, hint: `${((s?.volume_ml ?? 0) / 1000).toFixed(1)} L colhidos` },
    { label: "Hospitais", value: s?.hospitals, icon: Hospital, hint: `${s?.requests_done ?? 0}/${s?.requests_total ?? 0} pedidos atendidos` },
  ];
  const maxDonors = Math.max(1, ...Object.values(s?.donors_by_type ?? {}));

  return (
    <section className="mt-8">
      <h2 className="text-2xl">A nossa rede</h2>
      <p className="text-sm text-muted-foreground">Estatísticas de toda a comunidade Gota Viva.</p>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon, hint }) => (
          <div key={label} className="panel min-w-0 p-4">
            <Icon className="h-5 w-5 text-primary" />
            <p className="mt-2 font-display text-3xl font-semibold">{value ?? "—"}</p>
            <p className="truncate text-sm font-medium">{label}</p>
            {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="panel p-5">
          <h3 className="text-lg">Estoque por tipo sanguíneo</h3>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {(s?.stock ?? []).map((i) => {
              const lvl = stockLevel(i.units, i.min_units);
              return (
                <div key={i.blood_type} className="rounded-xl bg-muted p-3 text-center">
                  <p className="font-display text-xl font-semibold">{i.blood_type}</p>
                  <p className="text-xs text-muted-foreground">{i.units} un.</p>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${lvl.tone}`}>{lvl.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel p-5">
          <h3 className="text-lg">Doadores por tipo sanguíneo</h3>
          <ul className="mt-4 space-y-2">
            {BLOOD_TYPES.map((bt) => {
              const n = s?.donors_by_type?.[bt] ?? 0;
              return (
                <li key={bt} className="grid grid-cols-[2.5rem_minmax(0,1fr)_2rem] items-center gap-2 text-sm">
                  <span className="font-semibold">{bt}</span>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(n / maxDonors) * 100}%` }} />
                  </div>
                  <span className="text-right text-muted-foreground">{n}</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Building2 className="h-4 w-4" /> {s?.centers ?? 0} centros · {s?.units_delivered ?? 0} unidades entregues a hospitais
          </p>
        </div>
      </div>
    </section>
  );
}
