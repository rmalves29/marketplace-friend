import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Download, Users, Wallet, ShoppingBag, Percent } from "lucide-react";
import { AppShell, Panel, EmptyState } from "@/components/crm/AppShell";
import { StatCard } from "@/components/crm/StatCard";
import { Chip } from "@/components/crm/Chip";
import { usePeriod } from "@/components/crm/PeriodFilter";
import { money, tiopsChan } from "@/lib/crm";
import { formatRange } from "@/lib/period";
import { tiopsAffiliates } from "@/lib/tiops.functions";

export const Route = createFileRoute("/afiliados_/relatorio")({
  head: () => ({
    meta: [
      { title: "Relatório de afiliados | Tiops CRM" },
      {
        name: "description",
        content:
          "Relatório gerencial dos afiliados de Shopee e TikTok Shop: vendas atribuídas, comissão, ticket médio, taxa de comissão e curva ABC por período.",
      },
      { property: "og:title", content: "Relatório de afiliados | Tiops CRM" },
      {
        property: "og:description",
        content: "Desempenho consolidado dos afiliados de Shopee e TikTok Shop por período.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RelatorioAfiliados,
});

const pct = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 }).format(v || 0);

function RelatorioAfiliados() {
  const { range, control } = usePeriod("month");
  const load = useServerFn(tiopsAffiliates);

  const { data, isFetching } = useQuery({
    queryKey: ["tiops-affiliates-report", range.from, range.to],
    queryFn: () => load({ data: { from: range.from, to: range.to } }),
    staleTime: 5 * 60 * 1000,
  });

  const list = data?.affiliates ?? [];
  const totals = data?.totals ?? { affiliates: 0, sales: 0, commission: 0, orders: 0 };
  const errors = (data?.channels ?? []).filter((c) => c.error);

  const byChannel = (["shopee", "tiktok_shop"] as const).map((ch) => {
    const rows = list.filter((a) => a.channel === ch);
    const sales = rows.reduce((s, a) => s + a.sales, 0);
    const commission = rows.reduce((s, a) => s + a.commission, 0);
    const orders = rows.reduce((s, a) => s + a.orders, 0);
    const items = rows.reduce((s, a) => s + a.itemsSold, 0);
    const clicks = rows.reduce((s, a) => s + (a.clicks ?? 0), 0);
    return {
      channel: ch,
      affiliates: rows.length,
      sales,
      commission,
      orders,
      items,
      clicks,
      error: (data?.channels ?? []).find((c) => c.channel === ch)?.error ?? null,
      share: totals.sales ? sales / totals.sales : 0,
      ticket: orders ? sales / orders : 0,
      rate: sales ? commission / sales : 0,
      conversion: clicks ? orders / clicks : 0,
    };
  });

  // Curva ABC por vendas atribuídas
  let acc = 0;
  const ranking = [...list]
    .sort((a, b) => b.sales - a.sales)
    .map((a, i) => {
      const share = totals.sales ? a.sales / totals.sales : 0;
      acc += share;
      return {
        ...a,
        position: i + 1,
        share,
        cumulative: acc,
        curve: acc <= 0.8 ? "A" : acc <= 0.95 ? "B" : "C",
        ticket: a.orders ? a.sales / a.orders : 0,
        rate: a.sales ? a.commission / a.sales : 0,
        conversion: a.clicks ? a.orders / a.clicks : null,
      };
    });

  const classCount = (c: string) => ranking.filter((r) => r.curve === c).length;
  const top5Share = ranking.slice(0, 5).reduce((s, r) => s + r.share, 0);

  const exportCsv = () => {
    const head = [
      "Posição",
      "Afiliado",
      "Usuário",
      "Canal",
      "Pedidos",
      "Itens",
      "Cliques",
      "Vendas",
      "Comissão",
      "Ticket médio",
      "Taxa de comissão",
      "Participação",
      "Curva ABC",
    ];
    const rows = ranking.map((r) => [
      r.position,
      r.name,
      r.username ?? "",
      tiopsChan(r.channel).label,
      r.orders,
      r.itemsSold,
      r.clicks ?? "",
      r.sales.toFixed(2).replace(".", ","),
      r.commission.toFixed(2).replace(".", ","),
      r.ticket.toFixed(2).replace(".", ","),
      (r.rate * 100).toFixed(2).replace(".", ","),
      (r.share * 100).toFixed(2).replace(".", ","),
      r.curve,
    ]);
    const csv = [head, ...rows]
      .map((line) => line.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `afiliados-${range.from}-a-${range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell
      title="Relatório de afiliados"
      subtitle={`Shopee e TikTok Shop · ${formatRange(range.from, range.to)}`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {control}
          <button
            type="button"
            onClick={exportCsv}
            disabled={ranking.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
          >
            <Download className="size-4" />
            Exportar CSV
          </button>
        </div>
      }
    >
      <Link
        to="/afiliados"
        className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Voltar para Afiliados
      </Link>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Vendas atribuídas"
          value={isFetching && !data ? "…" : money(totals.sales)}
          hint={`${totals.orders} pedido(s) de ${totals.affiliates} afiliado(s)`}
          icon={Wallet}
        />
        <StatCard
          label="Comissão paga"
          value={isFetching && !data ? "…" : money(totals.commission)}
          hint={`Taxa média ${pct(totals.sales ? totals.commission / totals.sales : 0)}`}
          icon={Percent}
        />
        <StatCard
          label="Ticket médio"
          value={isFetching && !data ? "…" : money(totals.orders ? totals.sales / totals.orders : 0)}
          hint="Por pedido vindo de afiliado"
          icon={ShoppingBag}
        />
        <StatCard
          label="Concentração top 5"
          value={isFetching && !data ? "…" : pct(top5Share)}
          hint={`Curva A: ${classCount("A")} · B: ${classCount("B")} · C: ${classCount("C")}`}
          icon={Users}
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

      <Panel className="mt-6">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Resumo por canal</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Canal</th>
                <th className="px-5 py-3 font-medium">Afiliados</th>
                <th className="px-5 py-3 font-medium">Pedidos</th>
                <th className="px-5 py-3 font-medium">Itens</th>
                <th className="px-5 py-3 font-medium">Cliques</th>
                <th className="px-5 py-3 font-medium">Conversão</th>
                <th className="px-5 py-3 font-medium">Vendas</th>
                <th className="px-5 py-3 font-medium">Comissão</th>
                <th className="px-5 py-3 font-medium">Taxa</th>
                <th className="px-5 py-3 font-medium">Participação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {byChannel.map((c) => (
                <tr key={c.channel} className="hover:bg-muted/40">
                  <td className="px-5 py-3">
                    <Chip label={tiopsChan(c.channel).label} token={tiopsChan(c.channel).token} />
                  </td>
                  {c.error ? (
                    <td className="px-5 py-3 text-xs text-muted-foreground" colSpan={9}>
                      {c.error}
                    </td>
                  ) : (
                    <>
                      <td className="px-5 py-3 text-muted-foreground">{c.affiliates}</td>
                      <td className="px-5 py-3 text-muted-foreground">{c.orders}</td>
                      <td className="px-5 py-3 text-muted-foreground">{c.items}</td>
                      <td className="px-5 py-3 text-muted-foreground">{c.clicks || "—"}</td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {c.clicks ? pct(c.conversion) : "—"}
                      </td>
                      <td className="px-5 py-3 font-medium">{money(c.sales)}</td>
                      <td className="px-5 py-3 text-muted-foreground">{money(c.commission)}</td>
                      <td className="px-5 py-3 text-muted-foreground">{pct(c.rate)}</td>
                      <td className="px-5 py-3 text-muted-foreground">{pct(c.share)}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="mt-6">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Ranking de afiliados (curva ABC)</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            A = até 80% das vendas, B = até 95%, C = cauda longa.
          </p>
        </div>
        {isFetching && !data ? (
          <EmptyState message="Montando o relatório…" />
        ) : ranking.length === 0 ? (
          <EmptyState message="Nenhuma venda por afiliados no período." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">#</th>
                  <th className="px-5 py-3 font-medium">Afiliado</th>
                  <th className="px-5 py-3 font-medium">Canal</th>
                  <th className="px-5 py-3 font-medium">Pedidos</th>
                  <th className="px-5 py-3 font-medium">Itens</th>
                  <th className="px-5 py-3 font-medium">Vendas</th>
                  <th className="px-5 py-3 font-medium">Ticket</th>
                  <th className="px-5 py-3 font-medium">Comissão</th>
                  <th className="px-5 py-3 font-medium">Taxa</th>
                  <th className="px-5 py-3 font-medium">Part.</th>
                  <th className="px-5 py-3 font-medium">Acum.</th>
                  <th className="px-5 py-3 font-medium">ABC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ranking.map((r) => (
                  <tr key={`${r.channel}-${r.id}`} className="hover:bg-muted/40">
                    <td className="px-5 py-3 text-muted-foreground">{r.position}</td>
                    <td className="px-5 py-3">
                      <span className="font-medium">{r.name}</span>
                      {r.username ? (
                        <span className="ml-2 text-xs text-muted-foreground">@{r.username}</span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3">
                      <Chip label={tiopsChan(r.channel).label} token={tiopsChan(r.channel).token} />
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{r.orders}</td>
                    <td className="px-5 py-3 text-muted-foreground">{r.itemsSold}</td>
                    <td className="px-5 py-3 font-medium">{money(r.sales)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{money(r.ticket)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{money(r.commission)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{pct(r.rate)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{pct(r.share)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{pct(r.cumulative)}</td>
                    <td className="px-5 py-3">
                      <Chip
                        label={r.curve}
                        token={
                          r.curve === "A"
                            ? "bg-success/15 text-success"
                            : r.curve === "B"
                              ? "bg-warning/15 text-warning"
                              : "bg-muted text-muted-foreground"
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </AppShell>
  );
}
