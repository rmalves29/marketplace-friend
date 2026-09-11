import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, Panel, EmptyState } from "@/components/crm/AppShell";
import { Chip } from "@/components/crm/Chip";
import { CHANNELS, money } from "@/lib/crm";

export const Route = createFileRoute("/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes | Tiops CRM" },
      {
        name: "description",
        content: "Base unificada de clientes dos seus marketplaces com gasto total e histórico.",
      },
      { property: "og:title", content: "Clientes | Tiops CRM" },
      {
        property: "og:description",
        content: "Veja quem compra em cada canal, quanto gastou e como entrar em contato.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Clientes,
});

function Clientes() {
  const [search, setSearch] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("customers")
        .select("*")
        .order("total_spent", { ascending: false });
      return data ?? [];
    },
  });

  const filtered = data.filter((c) =>
    `${c.name} ${c.email ?? ""} ${c.city ?? ""}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <AppShell
      title="Clientes"
      subtitle="Todos os compradores reunidos em uma base só"
      actions={
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cliente…"
          className="w-56 rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
        />
      }
    >
      <Panel>
        {isLoading ? (
          <EmptyState message="Carregando clientes…" />
        ) : filtered.length === 0 ? (
          <EmptyState message="Nenhum cliente encontrado." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Cliente</th>
                  <th className="px-5 py-3 font-medium">Contato</th>
                  <th className="px-5 py-3 font-medium">Canal</th>
                  <th className="px-5 py-3 font-medium">Local</th>
                  <th className="px-5 py-3 font-medium">Pedidos</th>
                  <th className="px-5 py-3 font-medium">Total gasto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/40">
                    <td className="px-5 py-3 font-medium">{c.name}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      <div>{c.email ?? "—"}</div>
                      <div className="text-xs">{c.phone ?? ""}</div>
                    </td>
                    <td className="px-5 py-3">
                      <Chip label={CHANNELS[c.channel]?.label ?? c.channel} token={CHANNELS[c.channel]?.token} />
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {c.city ? `${c.city}/${c.state ?? ""}` : "—"}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{c.orders_count}</td>
                    <td className="px-5 py-3 font-medium">{money(Number(c.total_spent))}</td>
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
