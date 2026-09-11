import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Panel, EmptyState } from "@/components/crm/AppShell";
import { Chip } from "@/components/crm/Chip";
import { money, tiopsChan } from "@/lib/crm";
import { tiopsAds } from "@/lib/tiops.functions";

export const Route = createFileRoute("/anuncios")({
  head: () => ({
    meta: [
      { title: "Anúncios | Tiops CRM" },
      {
        name: "description",
        content:
          "Campanhas pagas e promoções reais de Mercado Livre, Shopee e TikTok Shop, com investimento e retorno.",
      },
      { property: "og:title", content: "Anúncios | Tiops CRM" },
      {
        property: "og:description",
        content: "Acompanhe o que você investe em publicidade e o retorno de cada canal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Anuncios,
});

function Anuncios() {
  const load = useServerFn(tiopsAds);
  const { data, isFetching } = useQuery({
    queryKey: ["tiops-ads"],
    queryFn: () => load(),
    staleTime: 10 * 60 * 1000,
  });

  const campaigns = data?.campaigns ?? [];
  const blocked = (data?.channels ?? []).filter((c) => c.error);

  return (
    <AppShell
      title="Anúncios"
      subtitle="Campanhas e promoções direto das plataformas"
    >
      {blocked.length > 0 ? (
        <Panel className="mb-6 space-y-3 p-5">
          <h2 className="text-sm font-semibold">Falta liberar acesso à publicidade</h2>
          {blocked.map((c) => (
            <p key={c.channel} className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{tiopsChan(c.channel).label}:</span>{" "}
              {c.error}
            </p>
          ))}
        </Panel>
      ) : null}

      <Panel>
        {isFetching && !data ? (
          <EmptyState message="Consultando campanhas…" />
        ) : campaigns.length === 0 ? (
          <EmptyState message="Nenhuma campanha ativa disponível para leitura." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Campanha</th>
                  <th className="px-5 py-3 font-medium">Canal</th>
                  <th className="px-5 py-3 font-medium">Situação</th>
                  <th className="px-5 py-3 font-medium">Investido</th>
                  <th className="px-5 py-3 font-medium">Retorno</th>
                  <th className="px-5 py-3 font-medium">Cliques</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {campaigns.map((c) => (
                  <tr key={`${c.channel}-${c.id}`} className="hover:bg-muted/40">
                    <td className="max-w-[24rem] truncate px-5 py-3 font-medium">{c.name}</td>
                    <td className="px-5 py-3">
                      <Chip label={tiopsChan(c.channel).label} token={tiopsChan(c.channel).token} />
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{c.status || "—"}</td>
                    <td className="px-5 py-3">{c.spend == null ? "—" : money(c.spend)}</td>
                    <td className="px-5 py-3 text-success">
                      {c.revenue == null ? "—" : money(c.revenue)}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{c.clicks ?? "—"}</td>
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
