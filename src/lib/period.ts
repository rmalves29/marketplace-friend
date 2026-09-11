export type PeriodPreset = "day" | "week" | "month" | "year" | "custom";

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  day: "Dia",
  week: "Semana",
  month: "Mês",
  year: "Ano",
  custom: "Personalizado",
};

const DAY = 86_400_000;

/** "Hoje" no fuso de Brasília (UTC-3), como YYYY-MM-DD. */
export function todayBrt(): string {
  const now = new Date(Date.now() - 3 * 3600_000);
  return now.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return new Date(d.getTime() + days * DAY).toISOString().slice(0, 10);
}

export function startOfWeek(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // segunda = 0
  return addDays(iso, -dow);
}

/** Faixa padrão do preset, já limitada a D-1 (dia corrente nunca entra). */
export function presetRange(preset: Exclude<PeriodPreset, "custom">): { from: string; to: string } {
  const to = addDays(todayBrt(), -1);
  if (preset === "day") return { from: to, to };
  if (preset === "week") return { from: startOfWeek(to), to };
  if (preset === "month") return { from: `${to.slice(0, 7)}-01`, to };
  return { from: `${to.slice(0, 4)}-01-01`, to };
}

export function formatRange(from: string, to: string): string {
  const f = (v: string) =>
    new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
      new Date(`${v}T12:00:00Z`),
    );
  return from === to ? f(from) : `${f(from)} — ${f(to)}`;
}
