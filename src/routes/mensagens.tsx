import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, Panel, EmptyState } from "@/components/crm/AppShell";
import { Chip } from "@/components/crm/Chip";
import { chan, dateTime } from "@/lib/crm";

export const Route = createFileRoute("/mensagens")({
  head: () => ({
    meta: [
      { title: "Mensagens | Tiops CRM" },
      {
        name: "description",
        content: "Central de atendimento com as perguntas dos compradores de todos os canais.",
      },
      { property: "og:title", content: "Mensagens | Tiops CRM" },
      {
        property: "og:description",
        content: "Responda dúvidas de compradores da Shopee, Shein, TikTok e Mercado Pago em um só lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Mensagens,
});

function Mensagens() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["messages"],
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .order("received_at", { ascending: false });
      return data ?? [];
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, answered }: { id: string; answered: boolean }) => {
      await supabase.from("messages").update({ answered }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["messages"] }),
  });

  return (
    <AppShell title="Mensagens" subtitle="Perguntas e atendimentos dos compradores">
      {isLoading ? (
        <Panel>
          <EmptyState message="Carregando mensagens…" />
        </Panel>
      ) : data.length === 0 ? (
        <Panel>
          <EmptyState message="Nenhuma mensagem por aqui." />
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((m) => (
            <Panel key={m.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Chip label={chan(m.channel).label} token={chan(m.channel).token} />
                <span className="text-sm font-medium">{m.customer_name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {dateTime(m.received_at)}
                </span>
              </div>
              <p className="mt-3 text-sm font-medium">{m.subject}</p>
              <p className="mt-1 text-sm text-muted-foreground">{m.body}</p>
              <button
                onClick={() => toggle.mutate({ id: m.id, answered: !m.answered })}
                className={`mt-4 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  m.answered
                    ? "bg-success/15 text-success"
                    : "bg-primary text-primary-foreground hover:opacity-90"
                }`}
              >
                {m.answered ? "Respondida" : "Marcar como respondida"}
              </button>
            </Panel>
          ))}
        </div>
      )}
    </AppShell>
  );
}
