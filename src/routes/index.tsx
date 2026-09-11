import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ShoppingBag, Users, Wallet, Package } from "lucide-react";
import { AppShell, Panel, EmptyState } from "@/components/crm/AppShell";
import { StatCard } from "@/components/crm/StatCard";
import { Chip } from "@/components/crm/Chip";
import { money, dateTime, tiopsChan } from "@/lib/crm";
import {
  PERIOD_LABELS,
  presetRange,
  formatRange,
  todayBrt,
  addDays,
  type PeriodPreset,
} from "@/lib/period";
import { tiopsDashboard } from "@/lib/tiops.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tiops CRM — Painel dos seus marketplaces" },
      {
        name: "description",
        content:
          "Painel único com pedidos, receita, produtos mais vendidos e clientes de Mercado Livre, Shopee, TikTok Shop e Shein.",
      },
      { property: "og:title", content: "Tiops CRM — Painel dos seus marketplaces" },
      {
        property: "og:description",
        content: "Acompanhe vendas de todos os seus canais em um só lugar, por período.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const PRESETS: PeriodPreset[] = ["day", "week", "month", "year", "custom"];

function Dashboard() {
  const [preset, setPreset] = useState<PeriodPreset>("day");
  const maxDay = addDays(todayBrt(), -1);
  const initial = presetRange("day");
  const [customFrom, setCustomFrom] = useState(initial.from);
  const [customTo, setCustomTo] = useState(initial.to);

  const range =
    preset === "custom"
      ? { from: customFrom, to: customTo > maxDay ? maxDay : customTo }
      : presetRange(preset);

  const load = useServerFn(tiopsDashboard);
  const { data, isFetching, error } = useQuery({
    queryKey: ["tiops-dashboard", range.from, range.to],
    queryFn: () => load({ data: { from: range.from, to: range.to } }),
    enabled: range.from <= range.to,
    staleTime: 5 * 60 * 1000,
  });

  const maxChannel = Math.max(1, ...(data?.channels ?? []).map((c) => c.revenue));
  const maxProduct = Math.max(1, ...(data?.topProducts ?? []).map((p) => p.qty));

  return (
    <AppShell
      title="Painel"
      subtitle={`Dados reais do Tiops Marketplace Connect · ${formatRange(range.from, range.to)}`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                preset === p
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
          {preset === "custom" ? (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                max={maxDay}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs"
              />
              <span className="text-xs text-muted-foreground">até</span>
              <input
                type="date"
                value={customTo}
                max={maxDay}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs"
              />
            </div>
          ) : null}
        </div>
      }
    >
      <p className="mb-4 text-xs text-muted-foreground">
        Todos os canais mostram dados até ontem. O dia corrente nunca entra, para não contar venda
        pela metade.
      </p>

      {error ? (
        <Panel className="mb-6 p-5 text-sm text-destructive">
          Não consegui falar com o Tiops agora. Tente novamente em instantes.
        </Panel>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Receita total"
          value={isFetching && !data ? "…" : money(data?.totals.revenue ?? 0)}
          hint="Pedidos válidos nos 4 canais"
          icon={Wallet}
        />
        <StatCard
          label="Pedidos"
          value={isFetching && !data ? "…" : String(data?.totals.orders ?? 0)}
          hint={`Ticket médio ${money(data?.totals.averageTicket ?? 0)}`}
          icon={ShoppingBag}
        />
        <StatCard
          label="Itens vendidos"
          value={isFetching && !data ? "…" : String(data?.totals.items ?? 0)}
          hint="Somando todos os pedidos"
          icon={Package}
        />
        <StatCard
          label="Clientes identificados"
          value={isFetching && !data ? "…" : String(data?.customers.length ?? 0)}
          hint="Mercado Livre, TikTok e Shopee"
          icon={Users}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">Produtos mais vendidos</h2>
          </div>
          {isFetching && !data ? (
            <EmptyState message="Carregando…" />
          ) : (data?.topProducts.length ?? 0) === 0 ? (
            <EmptyState message="Nenhuma venda no período." />
          ) : (
            <div className="space-y-4 px-5 py-4">
              {data!.topProducts.map((p) => (
                <div key={p.name}>
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="truncate">{p.name}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {p.qty} un · {money(p.revenue)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${(p.qty / maxProduct) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel>
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">Receita por canal</h2>
          </div>
          <div className="space-y-4 px-5 py-4">
            {(data?.channels ?? []).map((c) => (
              <div key={c.channel}>
                <div className="flex justify-between text-sm">
                  <span>{tiopsChan(c.channel).label}</span>
                  <span className="text-muted-foreground">{money(c.revenue)}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${(c.revenue / maxChannel) * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {c.error
                    ? `Indisponível: ${c.error}`
                    : c.orders === 0
                      ? `Nenhuma venda no período · até ${c.to}`
                      : `${c.orders} pedidos · até ${c.to}`}
                </p>
              </div>
            ))}
            {!data ? <p className="text-sm text-muted-foreground">Carregando…</p> : null}
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel>
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">Pedidos recentes</h2>
          </div>
          {(data?.recent.length ?? 0) === 0 ? (
            <EmptyState message="Sem pedidos no período." />
          ) : (
            <div className="divide-y divide-border">
              {data!.recent.map((o) => (
                <div
                  key={`${o.channel}-${o.id}`}
                  className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm"
                >
                  <Chip label={tiopsChan(o.channel).label} token={tiopsChan(o.channel).token} />
                  <span className="font-medium">{o.id}</span>
                  <span className="text-muted-foreground">{o.customer ?? "—"}</span>
                  <span className="ml-auto font-medium">{money(o.total)}</span>
                  <span className="w-full text-xs text-muted-foreground sm:w-auto">
                    {dateTime(o.date)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel>
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">Clientes identificados</h2>
          </div>
          {(data?.customers.length ?? 0) === 0 ? (
            <EmptyState message="Nenhum cliente identificado no período." />
          ) : (
            <div className="divide-y divide-border">
              {data!.customers.map((c) => (
                <div
                  key={`${c.channel}-${c.name}`}
                  className="flex items-center gap-3 px-5 py-3 text-sm"
                >
                  <Chip label={tiopsChan(c.channel).label} token={tiopsChan(c.channel).token} />
                  <span className="truncate">{c.name}</span>
                  <span className="ml-auto text-muted-foreground">
                    {c.orders} · {money(c.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
            Shein não informa o comprador; a Shopee informa apenas o apelido do usuário.
          </p>
        </Panel>
      </div>
    </AppShell>
  );
}
