import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, Panel, EmptyState } from "@/components/crm/AppShell";
import { Chip } from "@/components/crm/Chip";
import { chan, money, shortDate } from "@/lib/crm";

export const Route = createFileRoute("/anuncios")({
  head: () => ({
    meta: [
      { title: "Anúncios | Tiops CRM" },
      {
        name: "description",
        content: "Investimento, retorno e conversões das campanhas de anúncios de cada marketplace.",
      },
      { property: "og:title", content: "Anúncios | Tiops CRM" },
      {
        property: "og:description",
        content: "Compare o retorno das campanhas de TikTok, Shopee, Shein e Mercado Pago.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Anuncios,
});

function Anuncios() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ad_campaigns")
        .select("*")
        .order("spend", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <AppShell title="Anúncios" subtitle="Desempenho das campanhas por canal">
      <Panel>
        {isLoading ? (
          <EmptyState message="Carregando campanhas…" />
        ) : data.length === 0 ? (
          <EmptyState message="Nenhuma campanha cadastrada." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Campanha</th>
                  <th className="px-5 py-3 font-medium">Canal</th>
                  <th className="px-5 py-3 font-medium">Início</th>
                  <th className="px-5 py-3 font-medium">Investido</th>
                  <th className="px-5 py-3 font-medium">Receita</th>
                  <th className="px-5 py-3 font-medium">Retorno</th>
                  <th className="px-5 py-3 font-medium">Conversões</th>
                  <th className="px-5 py-3 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((c) => {
                  const roas = Number(c.spend) > 0 ? Number(c.revenue) / Number(c.spend) : 0;
                  return (
                    <tr key={c.id} className="hover:bg-muted/40">
                      <td className="px-5 py-3 font-medium">{c.name}</td>
                      <td className="px-5 py-3">
                        <Chip label={chan(c.channel).label} token={chan(c.channel).token} />
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{shortDate(c.started_at)}</td>
                      <td className="px-5 py-3">{money(Number(c.spend))}</td>
                      <td className="px-5 py-3">{money(Number(c.revenue))}</td>
                      <td className={`px-5 py-3 font-medium ${roas >= 2 ? "text-success" : "text-warning"}`}>
                        {roas.toFixed(2)}x
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{c.conversions}</td>
                      <td className="px-5 py-3">
                        <Chip
                          label={c.status === "active" ? "Ativa" : "Pausada"}
                          token={
                            c.status === "active"
                              ? "bg-success/15 text-success"
                              : "bg-muted text-muted-foreground"
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </AppShell>
  );
}
