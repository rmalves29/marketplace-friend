import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, Users, Wallet, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, Panel, EmptyState } from "@/components/crm/AppShell";
import { StatCard } from "@/components/crm/StatCard";
import { Chip } from "@/components/crm/Chip";
import { CHANNELS, chan, ordStatus, money, dateTime } from "@/lib/crm";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tiops CRM — Painel dos seus marketplaces" },
      {
        name: "description",
        content:
          "Painel único com pedidos, clientes, produtos, mensagens e anúncios de Shopee, Shein, TikTok Shop e Mercado Pago.",
      },
      { property: "og:title", content: "Tiops CRM — Painel dos seus marketplaces" },
      {
        property: "og:description",
        content:
          "Acompanhe vendas, clientes e anúncios de todos os seus canais em um só lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [orders, customers, messages, campaigns] = await Promise.all([
        supabase.from("orders").select("*").order("placed_at", { ascending: false }),
        supabase.from("customers").select("id, total_spent"),
        supabase.from("messages").select("id, answered"),
        supabase.from("ad_campaigns").select("spend, revenue"),
      ]);
      return {
        orders: orders.data ?? [],
        customers: customers.data ?? [],
        messages: messages.data ?? [],
        campaigns: campaigns.data ?? [],
      };
    },
  });

  const orders = data?.orders ?? [];
  const revenue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + Number(o.total), 0);
  const pending = orders.filter((o) => o.status === "pending" || o.status === "processing").length;
  const unanswered = (data?.messages ?? []).filter((m) => !m.answered).length;
  const spend = (data?.campaigns ?? []).reduce((s, c) => s + Number(c.spend), 0);
  const adRevenue = (data?.campaigns ?? []).reduce((s, c) => s + Number(c.revenue), 0);

  const byChannel = Object.keys(CHANNELS).map((key) => {
    const list = orders.filter((o) => o.channel === key && o.status !== "cancelled");
    return {
      key,
      label: chan(key).label,
      total: list.reduce((s, o) => s + Number(o.total), 0),
      count: list.length,
    };
  });
  const maxChannel = Math.max(1, ...byChannel.map((c) => c.total));

  return (
    <AppShell title="Painel" subtitle="Visão geral de todos os seus canais de venda">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Faturamento" value={money(revenue)} hint="Pedidos não cancelados" icon={Wallet} />
        <StatCard label="Pedidos em aberto" value={String(pending)} hint={`${orders.length} pedidos no total`} icon={ShoppingBag} />
        <StatCard label="Clientes" value={String((data?.customers ?? []).length)} hint="Base unificada" icon={Users} />
        <StatCard label="Mensagens sem resposta" value={String(unanswered)} hint="Atendimento pendente" icon={MessageSquare} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">Pedidos recentes</h2>
          </div>
          {isLoading ? (
            <EmptyState message="Carregando…" />
          ) : orders.length === 0 ? (
            <EmptyState message="Nenhum pedido ainda." />
          ) : (
            <div className="divide-y divide-border">
              {orders.slice(0, 6).map((o) => (
                <div key={o.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                  <span className="font-medium">{o.order_number}</span>
                  <Chip label={chan(o.channel).label} token={chan(o.channel).token} />
                  <span className="text-muted-foreground">{o.customer_name}</span>
                  <span className="ml-auto font-medium">{money(Number(o.total))}</span>
                  <Chip label={ordStatus(o.status).label} token={ordStatus(o.status).token} />
                  <span className="w-full text-xs text-muted-foreground sm:w-auto">{dateTime(o.placed_at)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel>
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold">Vendas por canal</h2>
            </div>
            <div className="space-y-4 px-5 py-4">
              {byChannel.map((c) => (
                <div key={c.key}>
                  <div className="flex justify-between text-sm">
                    <span>{c.label}</span>
                    <span className="text-muted-foreground">{money(c.total)}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${(c.total / maxChannel) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold">Anúncios</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 px-5 py-4 text-sm">
              <div>
                <p className="text-muted-foreground">Investido</p>
                <p className="mt-1 font-display text-lg font-semibold">{money(spend)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Retorno</p>
                <p className="mt-1 font-display text-lg font-semibold text-success">{money(adRevenue)}</p>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
