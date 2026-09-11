import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Panel, EmptyState } from "@/components/crm/AppShell";
import { Chip } from "@/components/crm/Chip";
import { dateTime, tiopsChan } from "@/lib/crm";
import { tiopsMessages } from "@/lib/tiops.functions";

export const Route = createFileRoute("/mensagens")({
  head: () => ({
    meta: [
      { title: "Mensagens | Tiops CRM" },
      {
        name: "description",
        content:
          "Perguntas e mensagens reais de compradores do Mercado Livre e do TikTok Shop, com o que ainda não foi respondido.",
      },
      { property: "og:title", content: "Mensagens | Tiops CRM" },
      {
        property: "og:description",
        content: "Acompanhe o atendimento aos compradores dos seus canais em um só lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Mensagens,
});

function Mensagens() {
  const load = useServerFn(tiopsMessages);
  const { data, isFetching } = useQuery({
    queryKey: ["tiops-messages"],
    queryFn: () => load(),
    staleTime: 2 * 60 * 1000,
  });

  const messages = data?.messages ?? [];
  const pending = messages.filter((m) => !m.answered).length;
  const errors = (data?.channels ?? []).filter((c) => c.error);

  return (
    <AppShell
      title="Mensagens"
      subtitle={
        isFetching && !data
          ? "Buscando conversas…"
          : `${messages.length} conversas · ${pending} sem resposta`
      }
    >
      <p className="mb-4 text-xs text-muted-foreground">
        Shopee e Shein não liberam o chat do comprador pela API, então só aparecem aqui Mercado
        Livre e TikTok Shop.
      </p>

      {errors.length > 0 ? (
        <Panel className="mb-4 space-y-1 p-4 text-xs text-muted-foreground">
          {errors.map((c) => (
            <p key={c.channel}>
              <span className="font-medium text-foreground">{tiopsChan(c.channel).label}:</span>{" "}
              {c.error}
            </p>
          ))}
        </Panel>
      ) : null}

      <Panel>
        {isFetching && !data ? (
          <EmptyState message="Carregando mensagens…" />
        ) : messages.length === 0 ? (
          <EmptyState message="Nenhuma pergunta ou mensagem pendente agora." />
        ) : (
          <div className="divide-y divide-border">
            {messages.map((m) => (
              <div key={`${m.channel}-${m.id}`} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <Chip label={tiopsChan(m.channel).label} token={tiopsChan(m.channel).token} />
                  <span className="font-medium">{m.from ?? "Comprador"}</span>
                  <span className="text-xs text-muted-foreground">{m.kind}</span>
                  <Chip
                    label={m.answered ? "Respondida" : "Sem resposta"}
                    token={
                      m.answered ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                    }
                  />
                  <span className="ml-auto text-xs text-muted-foreground">
                    {dateTime(m.date)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{m.text}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </AppShell>
  );
}
