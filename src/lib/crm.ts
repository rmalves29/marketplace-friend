export type ChannelKey = "shopee" | "shein" | "tiktok" | "mercadopago";

export const CHANNELS: Record<string, { label: string; token: string }> = {
  shopee: { label: "Shopee", token: "bg-primary/15 text-primary" },
  shein: { label: "Shein", token: "bg-chart-5/15 text-chart-5" },
  tiktok: { label: "TikTok Shop", token: "bg-accent/15 text-accent" },
  mercadopago: { label: "Mercado Pago", token: "bg-chart-4/15 text-chart-4" },
};

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

export function dateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(value),
  );
}

export function shortDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value));
}
