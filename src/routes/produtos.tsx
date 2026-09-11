import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, Panel, EmptyState } from "@/components/crm/AppShell";
import { Chip } from "@/components/crm/Chip";
import { CHANNELS, PRODUCT_STATUS, money } from "@/lib/crm";

export const Route = createFileRoute("/produtos")({
  head: () => ({
    meta: [
      { title: "Produtos e estoque | Tiops CRM" },
      {
        name: "description",
        content: "Anúncios, preços e estoque de cada canal de venda em uma lista única.",
      },
      { property: "og:title", content: "Produtos e estoque | Tiops CRM" },
      {
        property: "og:description",
        content: "Controle preços e estoque dos seus anúncios em Shopee, Shein, TikTok e Mercado Pago.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Produtos,
});

function Produtos() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").order("title");
      return data ?? [];
    },
  });

  return (
    <AppShell title="Produtos" subtitle="Anúncios, preços e estoque por canal">
      <Panel>
        {isLoading ? (
          <EmptyState message="Carregando produtos…" />
        ) : data.length === 0 ? (
          <EmptyState message="Nenhum produto cadastrado." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">SKU</th>
                  <th className="px-5 py-3 font-medium">Produto</th>
                  <th className="px-5 py-3 font-medium">Canal</th>
                  <th className="px-5 py-3 font-medium">Preço</th>
                  <th className="px-5 py-3 font-medium">Estoque</th>
                  <th className="px-5 py-3 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/40">
                    <td className="px-5 py-3 text-muted-foreground">{p.sku}</td>
                    <td className="px-5 py-3 font-medium">{p.title}</td>
                    <td className="px-5 py-3">
                      <Chip label={CHANNELS[p.channel]?.label ?? p.channel} token={CHANNELS[p.channel]?.token} />
                    </td>
                    <td className="px-5 py-3">{money(Number(p.price))}</td>
                    <td className={`px-5 py-3 ${p.stock === 0 ? "text-destructive" : "text-muted-foreground"}`}>
                      {p.stock}
                    </td>
                    <td className="px-5 py-3">
                      <Chip
                        label={PRODUCT_STATUS[p.status]?.label ?? p.status}
                        token={PRODUCT_STATUS[p.status]?.token}
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
