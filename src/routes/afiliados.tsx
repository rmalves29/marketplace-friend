import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Users, Wallet, ShoppingBag, FileBarChart } from "lucide-react";
import { AppShell, Panel, EmptyState } from "@/components/crm/AppShell";
import { StatCard } from "@/components/crm/StatCard";
import { Chip } from "@/components/crm/Chip";
import { usePeriod } from "@/components/crm/PeriodFilter";
import { money, tiopsChan } from "@/lib/crm";
import { formatRange } from "@/lib/period";
import { tiopsAffiliates } from "@/lib/tiops.functions";

const CHANNEL_STATUS: Array<{
  channel: "shopee" | "tiktok_shop" | "meli" | "shein";
  note: string;
}> = [
  { channel: "shopee", note: "Programa de afiliados ativo." },
  { channel: "tiktok_shop", note: "Criadores/afiliados disponíveis." },
  {
    channel: "meli",
    note: "Não possui programa de afiliados para o vendedor nesta integração.",
  },
  {
    channel: "shein",
    note: "Não possui programa de afiliados para o vendedor nesta integração.",
  },
];

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

  return (
    <AppShell
      title="Afiliados"
      subtitle={`Vendas por afiliados e criadores · ${formatRange(range.from, range.to)}`}
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
        <StatCard
          label="Afiliados com venda"
          value={isFetching && !data ? "…" : String(data?.totals.affiliates ?? 0)}
          hint="No período selecionado"
          icon={Users}
        />
        <StatCard
          label="Vendas atribuídas"
          value={isFetching && !data ? "…" : money(data?.totals.sales ?? 0)}
          hint="Valor dos pedidos vindos de afiliados"
          icon={Wallet}
        />
        <StatCard
          label="Comissão gerada"
          value={isFetching && !data ? "…" : money(data?.totals.commission ?? 0)}
          hint="Confirmada ou pela taxa acordada"
          icon={Wallet}
        />
        <StatCard
          label="Pedidos por afiliados"
          value={isFetching && !data ? "…" : String(data?.totals.orders ?? 0)}
          hint="Somando todos os canais"
          icon={ShoppingBag}
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
          <h2 className="text-sm font-semibold">Quem vendeu para você</h2>
        </div>
        {isFetching && !data ? (
          <EmptyState message="Carregando afiliados…" />
        ) : (data?.affiliates.length ?? 0) === 0 ? (
          <EmptyState message="Nenhuma venda por afiliados no período." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Afiliado</th>
                  <th className="px-5 py-3 font-medium">Canal</th>
                  <th className="px-5 py-3 font-medium">Pedidos</th>
                  <th className="px-5 py-3 font-medium">Itens</th>
                  <th className="px-5 py-3 font-medium">Cliques</th>
                  <th className="px-5 py-3 font-medium">Vendas</th>
                  <th className="px-5 py-3 font-medium">Comissão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data!.affiliates.map((a) => (
                  <tr key={`${a.channel}-${a.id}`} className="hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <span className="font-medium">{a.name}</span>
                      {a.username ? (
                        <span className="ml-2 text-xs text-muted-foreground">@{a.username}</span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3">
                      <Chip label={tiopsChan(a.channel).label} token={tiopsChan(a.channel).token} />
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{a.orders}</td>
                    <td className="px-5 py-3 text-muted-foreground">{a.itemsSold}</td>
                    <td className="px-5 py-3 text-muted-foreground">{a.clicks ?? "—"}</td>
                    <td className="px-5 py-3 font-medium">{money(a.sales)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{money(a.commission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel className="mt-6">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Situação por canal</h2>
        </div>
        <ul className="divide-y divide-border">
          {CHANNEL_STATUS.map((c) => {
            const live = (data?.channels ?? []).find((x) => x.channel === c.channel);
            const count = (data?.affiliates ?? []).filter((a) => a.channel === c.channel).length;
            return (
              <li key={c.channel} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <Chip label={tiopsChan(c.channel).label} token={tiopsChan(c.channel).token} />
                <span className="text-muted-foreground">
                  {live?.error ? live.error : live ? `${count} afiliado(s) no período` : c.note}
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>
    </AppShell>
  );
}
