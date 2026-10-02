export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export type BloodType = (typeof BLOOD_TYPES)[number];

export const DAYS_BETWEEN_DONATIONS = 60;
export const POINTS_PER_DONATION = 10;

export const URGENCY_LABEL: Record<string, string> = {
  normal: "Normal",
  alta: "Alta",
  critica: "Crítica",
};

export function stockLevel(units: number, min: number) {
  if (units < min * 0.5) return { label: "Crítico", tone: "bg-destructive text-destructive-foreground" };
  if (units < min) return { label: "Baixo", tone: "bg-warning text-warning-foreground" };
  return { label: "Adequado", tone: "bg-success text-success-foreground" };
}

export function fmtDate(d: string | Date, withTime = false) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function nextEligible(lastDonation?: string | null) {
  if (!lastDonation) return null;
  const d = new Date(lastDonation);
  d.setDate(d.getDate() + DAYS_BETWEEN_DONATIONS);
  return d;
}
