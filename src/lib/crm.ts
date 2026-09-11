export type ChannelKey = "shopee" | "shein" | "tiktok" | "mercadopago";

export const CHANNELS: Record<string, { label: string; token: string }> = {
  shopee: { label: "Shopee", token: "bg-primary/15 text-primary" },
  shein: { label: "Shein", token: "bg-chart-5/15 text-chart-5" },
  tiktok: { label: "TikTok Shop", token: "bg-accent/15 text-accent" },
  mercadopago: { label: "Mercado Pago", token: "bg-chart-4/15 text-chart-4" },
};

/** Canais conectados no Tiops Marketplace Connect. */
export const TIOPS_CHANNELS: Record<string, { label: string; token: string }> = {
  meli: { label: "Mercado Livre", token: "bg-chart-4/15 text-chart-4" },
  shopee: { label: "Shopee", token: "bg-primary/15 text-primary" },
  tiktok_shop: { label: "TikTok Shop", token: "bg-accent/15 text-accent" },
  shein: { label: "Shein", token: "bg-chart-5/15 text-chart-5" },
};

export function tiopsChan(key: string) {
  return TIOPS_CHANNELS[key] ?? { label: key, token: "bg-muted text-muted-foreground" };
}

export const ORDER_STATUS: Record<string, { label: string; token: string }> = {
  pending: { label: "Aguardando", token: "bg-warning/15 text-warning" },
  processing: { label: "Em separação", token: "bg-accent/15 text-accent" },
  shipped: { label: "Enviado", token: "bg-chart-5/15 text-chart-5" },
  delivered: { label: "Entregue", token: "bg-success/15 text-success" },
  cancelled: { label: "Cancelado", token: "bg-destructive/15 text-destructive" },
};

export const PRODUCT_STATUS: Record<string, { label: string; token: string }> = {
  active: { label: "Ativo", token: "bg-success/15 text-success" },
  paused: { label: "Pausado", token: "bg-muted text-muted-foreground" },
  out_of_stock: { label: "Sem estoque", token: "bg-destructive/15 text-destructive" },
};

export function money(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(value ?? 0),
  );
}

const TZ = "America/Sao_Paulo";

export function dateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: TZ,
  }).format(new Date(value));
}

export function shortDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: TZ }).format(
    new Date(value),
  );
}

export function chan(key: string) {
  return CHANNELS[key] ?? { label: key, token: "bg-muted text-muted-foreground" };
}

export function ordStatus(key: string) {
  return ORDER_STATUS[key] ?? { label: key, token: "bg-muted text-muted-foreground" };
}

export function prodStatus(key: string) {
  return PRODUCT_STATUS[key] ?? { label: key, token: "bg-muted text-muted-foreground" };
}
