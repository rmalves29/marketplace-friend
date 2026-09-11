import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, Panel, EmptyState } from "@/components/crm/AppShell";
import { Chip } from "@/components/crm/Chip";
import { dateTime } from "@/lib/crm";

export const Route = createFileRoute("/integracoes")({
  head: () => ({
    meta: [
      { title: "Integrações | Tiops CRM" },
      {
        name: "description",
        content: "Status da conexão com Shopee, Shein, TikTok Shop e Mercado Pago via Tiops Marketplace Connect.",
      },
      { property: "og:title", content: "Integrações | Tiops CRM" },
      {
        property: "og:description",
        content: "Acompanhe quais canais já estão conectados e a última sincronização de dados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Integracoes,
});

function Integracoes() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["integrations"],
    queryFn: async () => {
      const { data } = await supabase.from("integrations").select("*").order("label");
      return data ?? [];
    },
  });

  return (
    <AppShell
      title="Integrações"
      subtitle="Conexão dos canais pelo Tiops Marketplace Connect"
    >
      <Panel className="mb-6 p-5">
        <h2 className="text-sm font-semibold">Como ligar seus canais</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Os dados abaixo estão com exemplos para você visualizar o CRM funcionando. Para puxar as
          vendas reais, preciso do endereço de conexão do Tiops e da sua chave de acesso — assim que
          você enviar, ativo a sincronização automática de pedidos, clientes, produtos, mensagens e
          anúncios.
        </p>
      </Panel>

      {isLoading ? (
        <Panel>
          <EmptyState message="Carregando canais…" />
        </Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.map((i) => (
            <Panel key={i.id} className="p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-semibold">{i.label}</h3>
                <Chip
                  label={i.connected ? "Conectado" : "Não conectado"}
                  token={
                    i.connected
                      ? "bg-success/15 text-success"
                      : "bg-warning/15 text-warning"
                  }
                />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{i.notes}</p>
              <p className="mt-3 text-xs text-muted-foreground">
                Última sincronização: {dateTime(i.last_sync_at)}
              </p>
            </Panel>
          ))}
        </div>
      )}
    </AppShell>
  );
}
