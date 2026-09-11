import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell, Panel, EmptyState } from "@/components/crm/AppShell";
import { Chip } from "@/components/crm/Chip";
import { money, tiopsChan, TIOPS_CHANNELS } from "@/lib/crm";
import { tiopsProducts } from "@/lib/tiops.functions";

export const Route = createFileRoute("/produtos")({
  head: () => ({
    meta: [
      { title: "Produtos | Tiops CRM" },
      {
        name: "description",
        content:
          "Catálogo real de anúncios publicados em Mercado Livre, Shopee, TikTok Shop e Shein, com preço, estoque e situação.",
      },
      { property: "og:title", content: "Produtos | Tiops CRM" },
      {
        property: "og:description",
        content: "Veja todos os seus anúncios dos quatro canais em uma lista só.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Produtos,
});

function statusLabel(channel: string, raw: string) {
  const v = raw.toUpperCase();
  if (channel === "shein") return raw === "1" ? "À venda" : "Fora do ar";
  if (v === "NORMAL" || v === "ACTIVATE" || v === "ACTIVE") return "Ativo";
  if (v === "PAUSED" || v === "DEACTIVATED" || v === "UNLIST") return "Pausado";
  if (v === "CLOSED" || v === "DELETED") return "Encerrado";
  return raw || "—";
}

function statusToken(label: string) {
  if (label === "Ativo" || label === "À venda") return "bg-success/15 text-success";
  if (label === "Pausado" || label === "Fora do ar") return "bg-warning/15 text-warning";
  return "bg-muted text-muted-foreground";
}

function Produtos() {
  const [channel, setChannel] = useState<string>("all");
  const load = useServerFn(tiopsProducts);

  const { data, isFetching } = useQuery({
    queryKey: ["tiops-products"],
    queryFn: () => load(),
    staleTime: 10 * 60 * 1000,
  });

  const all = data?.products ?? [];
  const filtered = channel === "all" ? all : all.filter((p) => p.channel === channel);
  const errors = (data?.channels ?? []).filter((c) => c.error);

  return (
    <AppShell
      title="Produtos"
      subtitle="Anúncios publicados em cada canal, direto do Tiops"
      actions={
        <div className="flex flex-wrap gap-2">
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
      }
    >
      <p className="mb-4 text-xs text-muted-foreground">
        Mostro até 120 anúncios por canal, os mais recentes primeiro. A Shein não devolve estoque
        nesta consulta.
      </p>

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
          <EmptyState message="Carregando anúncios…" />
        ) : filtered.length === 0 ? (
          <EmptyState message="Nenhum anúncio encontrado." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Produto</th>
                  <th className="px-5 py-3 font-medium">Canal</th>
                  <th className="px-5 py-3 font-medium">Código</th>
                  <th className="px-5 py-3 font-medium">Preço</th>
                  <th className="px-5 py-3 font-medium">Estoque</th>
                  <th className="px-5 py-3 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p) => {
                  const label = statusLabel(p.channel, p.status);
                  return (
                    <tr key={`${p.channel}-${p.id}`} className="hover:bg-muted/40">
                      <td className="max-w-[26rem] truncate px-5 py-3 font-medium">{p.title}</td>
                      <td className="px-5 py-3">
                        <Chip
                          label={tiopsChan(p.channel).label}
                          token={tiopsChan(p.channel).token}
                        />
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{p.sku ?? p.id}</td>
                      <td className="px-5 py-3 font-medium">
                        {p.price == null ? (
                          <span className="text-xs text-muted-foreground">Por variação</span>
                        ) : (
                          money(p.price)
                        )}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{p.stock ?? "—"}</td>
                      <td className="px-5 py-3">
                        <Chip label={label} token={statusToken(label)} />
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
