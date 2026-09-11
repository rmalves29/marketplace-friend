import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, Panel, EmptyState } from "@/components/crm/AppShell";
import { Chip } from "@/components/crm/Chip";
import { CHANNELS, ORDER_STATUS, money, dateTime } from "@/lib/crm";

export const Route = createFileRoute("/pedidos")({
  head: () => ({
    meta: [
      { title: "Pedidos | Tiops CRM" },
      {
        name: "description",
        content: "Todos os pedidos de Shopee, Shein, TikTok Shop e Mercado Pago em uma lista única.",
      },
      { property: "og:title", content: "Pedidos | Tiops CRM" },
      {
        property: "og:description",
        content: "Acompanhe status, valores e clientes de cada pedido dos seus marketplaces.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Pedidos,
});

function Pedidos() {
  const [channel, setChannel] = useState<string>("all");
  const { data = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .order("placed_at", { ascending: false });
      return data ?? [];
    },
  });

  const filtered = channel === "all" ? data : data.filter((o) => o.channel === channel);

  return (
    <AppShell
      title="Pedidos"
      subtitle="Pedidos sincronizados de todos os canais"
      actions={
        <div className="flex flex-wrap gap-2">
          {["all", ...Object.keys(CHANNELS)].map((key) => (
            <button
              key={key}
              onClick={() => setChannel(key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                channel === key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {key === "all" ? "Todos" : CHANNELS[key].label}
            </button>
          ))}
        </div>
      }
    >
      <Panel>
        {isLoading ? (
          <EmptyState message="Carregando pedidos…" />
        ) : filtered.length === 0 ? (
          <EmptyState message="Nenhum pedido neste canal." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Pedido</th>
                  <th className="px-5 py-3 font-medium">Canal</th>
                  <th className="px-5 py-3 font-medium">Cliente</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Itens</th>
                  <th className="px-5 py-3 font-medium">Total</th>
                  <th className="px-5 py-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/40">
                    <td className="px-5 py-3 font-medium">{o.order_number}</td>
                    <td className="px-5 py-3">
                      <Chip label={CHANNELS[o.channel]?.label ?? o.channel} token={CHANNELS[o.channel]?.token} />
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{o.customer_name}</td>
                    <td className="px-5 py-3">
                      <Chip label={ORDER_STATUS[o.status]?.label ?? o.status} token={ORDER_STATUS[o.status]?.token} />
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{o.items_count}</td>
                    <td className="px-5 py-3 font-medium">{money(Number(o.total))}</td>
                    <td className="px-5 py-3 text-muted-foreground">{dateTime(o.placed_at)}</td>
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
