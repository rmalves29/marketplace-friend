import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Panel, EmptyState } from "@/components/crm/AppShell";
import { Chip } from "@/components/crm/Chip";
import { tiopsChan } from "@/lib/crm";
import { tiopsAccounts, tiopsHealth } from "@/lib/tiops.functions";

export const Route = createFileRoute("/integracoes")({
  head: () => ({
    meta: [
      { title: "Integrações | Tiops CRM" },
      {
        name: "description",
        content:
          "Status da conexão com Mercado Livre, Shopee, TikTok Shop e Shein via Tiops Marketplace Connect.",
      },
      { property: "og:title", content: "Integrações | Tiops CRM" },
      {
        property: "og:description",
        content: "Veja quais canais estão conectados e qual conta responde por cada um.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Integracoes,
});

function Integracoes() {
  const loadAccounts = useServerFn(tiopsAccounts);
  const loadHealth = useServerFn(tiopsHealth);

  const { data, isLoading } = useQuery({
    queryKey: ["tiops-accounts"],
    queryFn: () => loadAccounts(),
  });
  const { data: health } = useQuery({ queryKey: ["tiops-health"], queryFn: () => loadHealth() });

  return (
    <AppShell title="Integrações" subtitle="Canais conectados pelo Tiops Marketplace Connect">
      <Panel className="mb-6 p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold">Conexão com o Tiops</h2>
          <Chip
            label={health?.ok ? "Autenticado" : "Verificando…"}
            token={health?.ok ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}
          />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          A chave de acesso fica guardada com segurança no servidor — nunca é enviada ao navegador.
          Todas as consultas de pedidos passam por lá.
        </p>
      </Panel>

      {isLoading ? (
        <Panel>
          <EmptyState message="Carregando canais…" />
        </Panel>
      ) : data?.error ? (
        <Panel>
          <EmptyState message={`Não consegui listar as contas: ${data.error}`} />
        </Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(data?.accounts ?? []).map((a) => (
            <Panel key={`${a.marketplace}-${a.externalId}`} className="p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-base font-semibold">
                  {tiopsChan(a.marketplace).label}
                </h3>
                <Chip
                  label={a.connected ? "Conectado" : "Não conectado"}
                  token={
                    a.connected ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                  }
                />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{a.label}</p>
              <p className="mt-3 text-xs text-muted-foreground">Identificador: {a.externalId}</p>
            </Panel>
          ))}
        </div>
      )}
    </AppShell>
  );
}
