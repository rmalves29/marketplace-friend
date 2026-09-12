import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell, Panel, EmptyState } from "@/components/crm/AppShell";
import { Chip } from "@/components/crm/Chip";
import { usePeriod } from "@/components/crm/PeriodFilter";
import { money, dateTime, tiopsChan, TIOPS_CHANNELS } from "@/lib/crm";
import { formatRange } from "@/lib/period";
import { tiopsOrders } from "@/lib/tiops.functions";

export const Route = createFileRoute("/pedidos")({
  head: () => ({
    meta: [
      { title: "Pedidos | Tiops CRM" },
      {
        name: "description",
        content:
          "Pedidos reais de Mercado Livre, Shopee, TikTok Shop e Shein em uma lista única, filtrada por período.",
      },
      { property: "og:title", content: "Pedidos | Tiops CRM" },
      {
        property: "og:description",
        content: "Status, valores, itens e clientes de cada pedido dos seus marketplaces.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Pedidos,
});

function Pedidos() {
  const { range, control } = usePeriod("day");
  const [channel, setChannel] = useState<string>("all");
  const [status, setStatus] = useState<"valid" | "cancelled">("valid");
  const load = useServerFn(tiopsOrders);
  const loadCancelled = useServerFn(tiopsCancellations);

  const { data, isFetching } = useQuery({
    queryKey: ["tiops-orders", range.from, range.to],
    queryFn: () => load({ data: { from: range.from, to: range.to } }),
    staleTime: 5 * 60 * 1000,
  });

  const cancelledQuery = useQuery({
    queryKey: ["tiops-cancellations", range.from, range.to],
    queryFn: () => loadCancelled({ data: { from: range.from, to: range.to } }),
    enabled: status === "cancelled",
    staleTime: 5 * 60 * 1000,
  });

  const all = data?.orders ?? [];
  const filtered = channel === "all" ? all : all.filter((o) => o.channel === channel);
  const errors = (data?.channels ?? []).filter((c) => c.error);

  const cData = cancelledQuery.data;
  const cAll = cData?.cancelled ?? [];
  const cFiltered = channel === "all" ? cAll : cAll.filter((o) => o.channel === channel);
  const cErrors = (cData?.channels ?? []).filter((c) => c.error);

  if (status === "cancelled") {
    return (
      <AppShell
        title="Pedidos"
        subtitle={`Cancelamentos nos 4 canais · ${formatRange(range.from, range.to)}`}
        actions={control}
      >
        <StatusTabs status={status} setStatus={setStatus} />

        <div className="mb-4 flex flex-wrap gap-2">
          {["all", ...Object.keys(TIOPS_CHANNELS)].map((key) => (
            <button
              key={key}
              onClick={() => setChannel(key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                channel === key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {key === "all" ? `Todos (${cAll.length})` : tiopsChan(key).label}
            </button>
          ))}
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Cancelamentos"
            value={cancelledQuery.isFetching && !cData ? "…" : String(cData?.totals.count ?? 0)}
            hint="No período selecionado"
            icon={XCircle}
          />
          <StatCard
            label="Valor cancelado"
            value={cancelledQuery.isFetching && !cData ? "…" : money(cData?.totals.value ?? 0)}
            hint="Somando os 4 canais"
            icon={Wallet}
          />
          <StatCard
            label="Taxa de cancelamento"
            value={
              cancelledQuery.isFetching && !cData
                ? "…"
                : `${((cData?.totals.rate ?? 0) * 100).toFixed(1)}%`
            }
            hint={`${cData?.totals.validOrders ?? 0} pedidos válidos no período`}
            icon={Percent}
          />
          <StatCard
            label="Motivo mais comum"
            value={cData?.topReason ? String(cData.topReason.count) : "—"}
            hint={cData?.topReason?.reason ?? "Sem motivo informado pelos canais"}
            icon={AlertTriangle}
          />
        </div>

        {cErrors.length > 0 ? (
          <Panel className="mb-4 p-4 text-xs text-muted-foreground">
            {cErrors.map((c) => (
              <p key={c.channel}>
                {tiopsChan(c.channel).label}: {c.error}
              </p>
            ))}
          </Panel>
        ) : null}

        <Panel>
          {cancelledQuery.isFetching && !cData ? (
            <EmptyState message="Carregando cancelamentos…" />
          ) : cFiltered.length === 0 ? (
            <EmptyState message="Nenhum cancelamento neste período." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Pedido</th>
                    <th className="px-5 py-3 font-medium">Canal</th>
                    <th className="px-5 py-3 font-medium">Cliente</th>
                    <th className="px-5 py-3 font-medium">Motivo</th>
                    <th className="px-5 py-3 font-medium">Cancelado por</th>
                    <th className="px-5 py-3 font-medium">Valor</th>
                    <th className="px-5 py-3 font-medium">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cFiltered.map((o) => (
                    <tr key={`${o.channel}-${o.id}`} className="hover:bg-muted/40">
                      <td className="px-5 py-3 font-medium">{o.id}</td>
                      <td className="px-5 py-3">
                        <Chip
                          label={tiopsChan(o.channel).label}
                          token={tiopsChan(o.channel).token}
                        />
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{o.customer ?? "—"}</td>
                      <td className="max-w-[20rem] truncate px-5 py-3 text-muted-foreground">
                        {o.reason ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{o.cancelledBy ?? "—"}</td>
                      <td className="px-5 py-3 font-medium text-destructive">{money(o.total)}</td>
                      <td className="px-5 py-3 text-muted-foreground">{dateTime(o.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
            Na Shein o cancelamento aparece como pedido reembolsado ou recusado, e o motivo não é
            detalhado pela plataforma.
          </p>
        </Panel>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Pedidos"
      subtitle={`Pedidos reais do Tiops · ${formatRange(range.from, range.to)}`}
      actions={control}
    >
      <StatusTabs status={status} setStatus={setStatus} />

      <div className="mb-4 flex flex-wrap gap-2">
        {["all", ...Object.keys(TIOPS_CHANNELS)].map((key) => (
          <button
            key={key}
            onClick={() => setChannel(key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              channel === key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {key === "all" ? `Todos (${all.length})` : tiopsChan(key).label}
          </button>
        ))}
      </div>

      {errors.length > 0 ? (
        <Panel className="mb-4 p-4 text-xs text-muted-foreground">
          {errors.map((c) => (
            <p key={c.channel}>
              {tiopsChan(c.channel).label}: {c.error}
            </p>
          ))}
        </Panel>
      ) : null}

      <Panel>
        {isFetching && !data ? (
          <EmptyState message="Carregando pedidos…" />
        ) : filtered.length === 0 ? (
          <EmptyState message="Nenhum pedido neste período." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Pedido</th>
                  <th className="px-5 py-3 font-medium">Canal</th>
                  <th className="px-5 py-3 font-medium">Cliente</th>
                  <th className="px-5 py-3 font-medium">Produtos</th>
                  <th className="px-5 py-3 font-medium">Itens</th>
                  <th className="px-5 py-3 font-medium">Total</th>
                  <th className="px-5 py-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((o) => (
                  <tr key={`${o.channel}-${o.id}`} className="hover:bg-muted/40">
                    <td className="px-5 py-3 font-medium">{o.id}</td>
                    <td className="px-5 py-3">
                      <Chip label={tiopsChan(o.channel).label} token={tiopsChan(o.channel).token} />
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{o.customer ?? "—"}</td>
                    <td className="max-w-[22rem] truncate px-5 py-3 text-muted-foreground">
                      {o.itemNames.join(", ") || "—"}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{o.itemsCount}</td>
                    <td className="px-5 py-3 font-medium">
                      {o.cancelled ? (
                        <span className="text-muted-foreground line-through">
                          {money(o.total)}
                        </span>
                      ) : (
                        money(o.total)
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{dateTime(o.date)}</td>
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
