import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowUpRight,
  BadgeDollarSign,
  FileBarChart,
  HandCoins,
  MousePointerClick,
  ShoppingBag,
  Users,
} from "lucide-react";
import { AppShell, Panel, EmptyState } from "@/components/crm/AppShell";
import { Chip } from "@/components/crm/Chip";
import { usePeriod } from "@/components/crm/PeriodFilter";
import { money, tiopsChan } from "@/lib/crm";
import { formatRange } from "@/lib/period";
import { tiopsAffiliates } from "@/lib/tiops.functions";

const AFFILIATE_CHANNELS = ["shopee", "tiktok_shop"] as const;

const compactNumber = new Intl.NumberFormat("pt-BR", { notation: "compact" });

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof Users;
  tone: "primary" | "success" | "accent" | "warning";
}) {
  const toneClass = {
    primary: "bg-primary/12 text-primary",
    success: "bg-success/12 text-success",
    accent: "bg-accent/12 text-accent",
    warning: "bg-warning/12 text-warning",
  }[tone];

  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40">
      <div className="mb-5 flex items-start justify-between gap-4">
        <span className={`grid size-9 place-items-center rounded-lg ${toneClass}`}>
          <Icon className="size-4" />
        </span>
        <span className="rounded-md bg-muted px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground">
          Período
        </span>
      </div>
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

export const Route = createFileRoute("/afiliados")({
  head: () => ({
    meta: [
      { title: "Afiliados | Tiops CRM" },
      {
        name: "description",
        content:
          "Afiliados e criadores que vendem seus produtos na Shopee e no TikTok Shop, com vendas atribuídas e comissão por período.",
      },
      { property: "og:title", content: "Afiliados | Tiops CRM" },
      {
        property: "og:description",
        content: "Vendas atribuídas, comissão gerada e canal de origem de cada afiliado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Afiliados,
});

function Afiliados() {
  const { range, control } = usePeriod("month");
  const load = useServerFn(tiopsAffiliates);

  const { data, isFetching } = useQuery({
    queryKey: ["tiops-affiliates", range.from, range.to],
    queryFn: () => load({ data: { from: range.from, to: range.to } }),
    staleTime: 5 * 60 * 1000,
  });

  const errors = (data?.channels ?? []).filter((c) => c.error);
  const affiliates = data?.affiliates ?? [];
  const totals = data?.totals ?? { affiliates: 0, sales: 0, commission: 0, orders: 0 };
  const items = affiliates.reduce((sum, affiliate) => sum + affiliate.itemsSold, 0);
  const clicks = affiliates.reduce((sum, affiliate) => sum + (affiliate.clicks ?? 0), 0);
  const affiliatesWithClicks = affiliates.filter((affiliate) => affiliate.clicks !== null);
  const conversion = clicks ? totals.orders / clicks : null;
  const maxSales = affiliates[0]?.sales ?? 0;
  const activeChannels = AFFILIATE_CHANNELS.filter((channel) =>
    (data?.channels ?? []).some((item) => item.channel === channel && !item.error),
  );

  const percent = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 }).format(value);

  return (
    <AppShell
      title="Painel de afiliados"
      subtitle={`Performance de criadores e vendas atribuídas · ${formatRange(range.from, range.to)}`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {control}
          <Link
            to="/afiliados/relatorio"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <FileBarChart className="size-4" />
            Relatório gerencial
          </Link>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="GMV de afiliados"
          value={isFetching && !data ? "…" : money(totals.sales)}
          note={`${totals.orders} pedidos atribuídos`}
          icon={BadgeDollarSign}
          tone="primary"
        />
        <MetricCard
          label="Comissão estimada"
          value={isFetching && !data ? "…" : money(totals.commission)}
          note={totals.sales ? `${percent(totals.commission / totals.sales)} do GMV` : "Sem vendas no período"}
          icon={HandCoins}
          tone="warning"
        />
        <MetricCard
          label="Cliques registrados"
          value={isFetching && !data ? "…" : affiliatesWithClicks.length ? compactNumber.format(clicks) : "—"}
          note={conversion === null ? "Métrica indisponível no período" : `${percent(conversion)} de conversão`}
          icon={MousePointerClick}
          tone="accent"
        />
        <MetricCard
          label="Afiliados com venda"
          value={isFetching && !data ? "…" : String(totals.affiliates)}
          note={`${items} itens vendidos`}
          icon={Users}
          tone="success"
        />
      </div>

      {errors.length > 0 ? (
        <Panel className="mt-6 p-4 text-xs text-muted-foreground">
          {errors.map((c) => (
            <p key={c.channel}>
              {tiopsChan(c.channel).label}: {c.error}
            </p>
          ))}
        </Panel>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Canais de afiliados</h2>
            <span className="text-xs text-muted-foreground">{activeChannels.length} disponível</span>
          </div>
          <div className="space-y-3">
          {AFFILIATE_CHANNELS.map((channel) => {
            const live = (data?.channels ?? []).find((item) => item.channel === channel);
            const channelAffiliates = affiliates.filter((affiliate) => affiliate.channel === channel);
            const channelSales = channelAffiliates.reduce((sum, affiliate) => sum + affiliate.sales, 0);
            const ready = Boolean(live && !live.error);
            return (
              <Panel key={channel} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`grid size-10 shrink-0 place-items-center rounded-lg font-display text-sm font-bold ${ready ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {channel === "shopee" ? "S" : "T"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{tiopsChan(channel).label}</p>
                      <p className={`mt-0.5 text-xs ${ready ? "text-success" : "text-warning"}`}>
                        {ready ? "Dados disponíveis" : "Aguardando autorização"}
                      </p>
                    </div>
                  </div>
                  <span className={`mt-1 size-2 shrink-0 rounded-full ${ready ? "bg-success" : "bg-warning"}`} />
                </div>
                {ready ? (
                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">Afiliados</p>
                      <p className="mt-1 font-semibold text-foreground">{channelAffiliates.length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">GMV</p>
                      <p className="mt-1 font-semibold text-foreground">{money(channelSales)}</p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 border-t border-border pt-3 text-xs leading-5 text-muted-foreground">
                    O canal oferece afiliados, mas ainda não liberou os dados para esta integração.
                  </p>
                )}
              </Panel>
            );
          })}
          </div>
        </section>

        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold">Melhores afiliados</h2>
              <p className="mt-1 text-xs text-muted-foreground">Ranking por GMV no período</p>
            </div>
            <Link to="/afiliados/relatorio" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80">
              Ver relatório <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
          {isFetching && !data ? (
            <EmptyState message="Carregando afiliados…" />
          ) : affiliates.length === 0 ? (
            <EmptyState message="Nenhuma venda por afiliados no período." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/30 text-left text-[10px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Afiliado</th>
                    <th className="px-5 py-3 font-semibold">Canal</th>
                    <th className="px-5 py-3 font-semibold">Pedidos</th>
                    <th className="px-5 py-3 font-semibold">Desempenho</th>
                    <th className="px-5 py-3 text-right font-semibold">GMV</th>
                    <th className="px-5 py-3 text-right font-semibold">Comissão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {affiliates.slice(0, 10).map((affiliate, index) => (
                    <tr key={`${affiliate.channel}-${affiliate.id}`} className="transition-colors hover:bg-muted/30">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-medium text-foreground">{affiliate.name}</p>
                            {affiliate.username ? <p className="text-xs text-muted-foreground">@{affiliate.username}</p> : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3"><Chip label={tiopsChan(affiliate.channel).label} token={tiopsChan(affiliate.channel).token} /></td>
                      <td className="px-5 py-3 text-muted-foreground">{affiliate.orders}</td>
                      <td className="min-w-32 px-5 py-3">
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-success" style={{ width: `${maxSales ? Math.max(6, (affiliate.sales / maxSales) * 100) : 0}%` }} />
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-foreground">{money(affiliate.sales)}</td>
                      <td className="px-5 py-3 text-right text-success">{money(affiliate.commission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <Panel className="mt-6 overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Visão operacional</h2>
          <p className="mt-1 text-xs text-muted-foreground">Volume gerado pelos canais disponíveis</p>
        </div>
        <div className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="p-5">
            <ShoppingBag className="size-4 text-primary" />
            <p className="mt-4 text-xs text-muted-foreground">Pedidos atribuídos</p>
            <p className="mt-1 font-display text-xl font-semibold">{totals.orders}</p>
          </div>
          <div className="p-5">
            <BadgeDollarSign className="size-4 text-success" />
            <p className="mt-4 text-xs text-muted-foreground">Ticket médio</p>
            <p className="mt-1 font-display text-xl font-semibold">{money(totals.orders ? totals.sales / totals.orders : 0)}</p>
          </div>
          <div className="p-5">
            <Users className="size-4 text-accent" />
            <p className="mt-4 text-xs text-muted-foreground">Itens por afiliado</p>
            <p className="mt-1 font-display text-xl font-semibold">{totals.affiliates ? (items / totals.affiliates).toFixed(1).replace(".", ",") : "0"}</p>
          </div>
        </div>
      </Panel>
    </AppShell>
  );
}
