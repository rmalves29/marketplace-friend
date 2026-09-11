import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Panel, EmptyState } from "@/components/crm/AppShell";
import { Chip } from "@/components/crm/Chip";
import { usePeriod } from "@/components/crm/PeriodFilter";
import { money, dateTime, tiopsChan } from "@/lib/crm";
import { formatRange } from "@/lib/period";
import { tiopsOrders } from "@/lib/tiops.functions";

export const Route = createFileRoute("/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes | Tiops CRM" },
      {
        name: "description",
        content:
          "Compradores identificados nos pedidos reais de Mercado Livre, TikTok Shop e Shopee, com total gasto e número de pedidos.",
      },
      { property: "og:title", content: "Clientes | Tiops CRM" },
      {
        property: "og:description",
        content: "Veja quem mais compra nos seus canais e quanto cada pessoa já gastou.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Clientes,
});

function Clientes() {
  const { range, control } = usePeriod("month");
  const load = useServerFn(tiopsOrders);

  const { data, isFetching } = useQuery({
    queryKey: ["tiops-orders", range.from, range.to],
    queryFn: () => load({ data: { from: range.from, to: range.to } }),
    staleTime: 5 * 60 * 1000,
  });

  const map = new Map<
    string,
    { name: string; channel: string; orders: number; total: number; last: string }
  >();
  for (const o of data?.orders ?? []) {
    if (o.cancelled || !o.customer) continue;
    const key = `${o.channel}:${o.customer}`;
    const cur =
      map.get(key) ??
      { name: o.customer, channel: o.channel, orders: 0, total: 0, last: o.date };
    cur.orders += 1;
    cur.total += o.total;
    if (o.date > cur.last) cur.last = o.date;
    map.set(key, cur);
  }
  const customers = [...map.values()].sort((a, b) => b.total - a.total);

  return (
    <AppShell
      title="Clientes"
      subtitle={`Compradores identificados · ${formatRange(range.from, range.to)}`}
      actions={control}
    >
      <p className="mb-4 text-xs text-muted-foreground">
        Mercado Livre e TikTok Shop informam o nome do comprador; a Shopee informa apenas o apelido
        do usuário e a Shein não expõe o comprador ao vendedor.
      </p>

      <Panel>
        {isFetching && !data ? (
          <EmptyState message="Carregando clientes…" />
        ) : customers.length === 0 ? (
          <EmptyState message="Nenhum cliente identificado no período." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Cliente</th>
                  <th className="px-5 py-3 font-medium">Canal</th>
                  <th className="px-5 py-3 font-medium">Pedidos</th>
                  <th className="px-5 py-3 font-medium">Total gasto</th>
                  <th className="px-5 py-3 font-medium">Última compra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customers.map((c) => (
                  <tr key={`${c.channel}-${c.name}`} className="hover:bg-muted/40">
                    <td className="px-5 py-3 font-medium">{c.name}</td>
                    <td className="px-5 py-3">
                      <Chip label={tiopsChan(c.channel).label} token={tiopsChan(c.channel).token} />
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{c.orders}</td>
                    <td className="px-5 py-3 font-medium">{money(c.total)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{dateTime(c.last)}</td>
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
