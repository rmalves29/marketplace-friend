// Server-only client for the Tiops Marketplace Connect API (MCP endpoint).
// The API key never leaves the server.

const TIOPS_URL = "https://mcp.tiops.com.br/mcp";

type Json = Record<string, unknown>;

function parseSse(text: string): Json {
  const lines = text.split("\n");
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      return JSON.parse(line.slice(6)) as Json;
    }
  }
  return JSON.parse(text) as Json;
}

export async function tiopsTool<T = any>(name: string, args: Json = {}): Promise<T> {
  const key = process.env["TIOPS_API_KEY"];
  if (!key) throw new Error("TIOPS_API_KEY não configurada.");

  const res = await fetch(TIOPS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: { name, arguments: args },
    }),
  });

  if (!res.ok) throw new Error(`Tiops ${name}: HTTP ${res.status}`);

  const payload = parseSse(await res.text()) as {
    error?: { message?: string };
    result?: { content?: Array<{ type: string; text?: string }>; isError?: boolean };
  };

  if (payload.error) throw new Error(`Tiops ${name}: ${payload.error.message ?? "erro"}`);
  const text = payload.result?.content?.find((c) => c.type === "text")?.text;
  if (!text) throw new Error(`Tiops ${name}: resposta vazia`);

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export async function tiopsPing(): Promise<{ ok: boolean; accounts: number; message: string }> {
  const res = await tiopsTool<{ data?: { accounts?: unknown[] } }>("list_accounts");
  const accounts = res?.data?.accounts ?? [];
  return { ok: true, accounts: accounts.length, message: "Autenticação OK" };
}
