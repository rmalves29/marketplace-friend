import { tiopsTool } from "./tiops.server";
import { channelMaxDay, type ChannelId } from "./tiops-orders.server";

/* ------------------------------------- Tipos --------------------------------------- */

export type CancelledOrder = {
  channel: ChannelId;
  id: string;
  date: string; // ISO
  total: number;
  reason: string | null;
  cancelledBy: string | null;
  customer: string | null;
};

export type ChannelCancellations = {
  channel: ChannelId;
  from: string;
  to: string;
  cancelled: CancelledOrder[];
  error: string | null;
};

export type Affiliate = {
  channel: ChannelId;
  id: string;
  name: string;
  username: string | null;
  orders: number;
  itemsSold: number;
  sales: number;
  commission: number;
  clicks: number | null;
};

export type ChannelAffiliates = {
  channel: ChannelId;
  affiliates: Affiliate[];
  error: string | null;
};

const BRT = "-03:00";

function startUnix(day: string) {
  return Math.floor(new Date(`${day}T00:00:00${BRT}`).getTime() / 1000);
}
function endUnix(day: string) {
  return Math.floor(new Date(`${day}T23:59:59${BRT}`).getTime() / 1000);
}
function num(v: unknown): number {
  const n = typeof v === "string" ? Number(String(v).replace("%", "")) : typeof v === "number" ? v : 0;
  return Number.isFinite(n) ? n : 0;
}
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
function msg(e: unknown): string {
  return e instanceof Error ? e.message : "Canal indisponível no momento";
}
function payloadError(res: any): string | null {
  const err = res?.error ?? res?.data?.error;
  return typeof err === "string" && err ? err : null;
}

/* --------------------------------- Cancelamentos ----------------------------------- */

async function meliUserId(): Promise<string | null> {
  try {
    const res = await tiopsTool<any>("list_accounts");
    const acc = (res?.data?.accounts ?? []).find(
      (a: any) => a?.marketplace === "meli" && a?.connected,
    );
    const id = acc?.param_to_use?.meliUserId ?? acc?.external_id;
    return id ? String(id) : null;
  } catch {
    return null;
  }
}

const MELI_CANCEL_BY: Record<string, string> = {
  buyer: "Comprador",
  seller: "Vendedor",
  admin: "Mercado Livre",
  system: "Sistema",
};

async function cancelledMeli(from: string, to: string): Promise<CancelledOrder[]> {
  const userId = await meliUserId();
  const out: CancelledOrder[] = [];
  const limit = 50;
  const start = startUnix(from);
  const end = endUnix(to);

  for (let offset = 0; offset < 500; offset += limit) {
    const res = await tiopsTool<any>("list_orders", {
      date_from: `${from}T00:00:00.000${BRT}`,
      date_to: `${to}T23:59:59.000${BRT}`,
      limit,
      offset,
      ...(userId ? { meliUserId: userId } : {}),
    });
    const results: any[] = res?.data?.results ?? [];
    for (const o of results) {
      if (String(o.status ?? "") !== "cancelled") continue;
      const when = o?.cancel_detail?.date ?? o?.date_created;
      const at = Math.floor(new Date(when).getTime() / 1000);
      if (at < start || at > end) continue;
      const group = String(o?.cancel_detail?.group ?? o?.cancel_detail?.requested_by ?? "");
      out.push({
        channel: "meli",
        id: String(o.id),
        date: new Date(at * 1000).toISOString(),
        total: num(o.total_amount),
        reason: o?.cancel_detail?.description ?? o?.cancel_detail?.code ?? null,
        cancelledBy: group ? (MELI_CANCEL_BY[group] ?? group) : null,
        customer: o?.buyer?.nickname ?? null,
      });
    }
    if (results.length < limit) break;
  }
  return out;
}

const SHOPEE_CANCEL_BY: Record<string, string> = {
  buyer: "Comprador",
  seller: "Vendedor",
  system: "Sistema",
  shopee: "Shopee",
};

async function cancelledShopee(from: string, to: string): Promise<CancelledOrder[]> {
  const start = startUnix(from);
  const end = endUnix(to);
  const WINDOW = 15 * 86_400;
  const snList: string[] = [];

  for (let ws = start; ws <= end; ws += WINDOW) {
    const we = Math.min(ws + WINDOW - 1, end);
    let cursor = "";
    for (let page = 0; page < 20; page++) {
      const res = await tiopsTool<any>("shopee_list_orders", {
        params: {
          time_range_field: "create_time",
          time_from: ws,
          time_to: we,
          page_size: 100,
          order_status: "CANCELLED",
          ...(cursor ? { cursor } : {}),
        },
      });
      const r = res?.data?.response;
      for (const o of r?.order_list ?? []) if (o?.order_sn) snList.push(String(o.order_sn));
      if (!r?.more || !r?.next_cursor) break;
      cursor = String(r.next_cursor);
    }
  }

  const out: CancelledOrder[] = [];
  for (const batch of chunk(snList, 40)) {
    const res = await tiopsTool<any>("shopee_get_order_detail", { order_sn: batch.join(",") });
    for (const o of res?.data?.response?.order_list ?? []) {
      const at = num(o.create_time);
      const items: any[] = o.item_list ?? [];
      const by = String(o.cancel_by ?? "").toLowerCase();
      out.push({
        channel: "shopee",
        id: String(o.order_sn),
        date: new Date(at * 1000).toISOString(),
        total: items.reduce(
          (s, it) => s + (num(it?.model_quantity_purchased) || 1) * num(it?.model_discounted_price),
          0,
        ),
        reason: o.buyer_cancel_reason || o.cancel_reason || null,
        cancelledBy: by ? (SHOPEE_CANCEL_BY[by] ?? by) : null,
        customer: o.buyer_username ? String(o.buyer_username) : null,
      });
    }
  }
  return out;
}

const TIKTOK_CANCEL_BY: Record<string, string> = {
  BUYER: "Comprador",
  SELLER: "Vendedor",
  SYSTEM: "Sistema",
  OPERATOR: "TikTok Shop",
};

async function cancelledTiktok(from: string, to: string): Promise<CancelledOrder[]> {
  const start = startUnix(from);
  const end = endUnix(to);
  const rows: any[] = [];
  let token = "";
  for (let page = 0; page < 20; page++) {
    const res = await tiopsTool<any>("tiktok_search_cancellations", {
      page_size: 50,
      create_time_ge: start,
      create_time_lt: end + 1,
      ...(token ? { page_token: token } : {}),
    });
    const err = payloadError(res);
    if (err) throw new Error(err);
    const data = res?.data ?? res;
    rows.push(...(data?.cancellations ?? []));
    if (!data?.next_page_token) break;
    token = String(data.next_page_token);
  }

  const byOrder = new Map<string, any>();
  for (const c of rows) if (c?.order_id) byOrder.set(String(c.order_id), c);

  const totals = new Map<string, { total: number; customer: string | null }>();
  for (const batch of chunk([...byOrder.keys()], 20)) {
    const res = await tiopsTool<any>("tiktok_get_order", { ids: batch.join(",") });
    const data = res?.data ?? res;
    for (const o of data?.orders ?? []) {
      totals.set(String(o.id), {
        total: num(o?.payment?.total_amount),
        customer: o?.recipient_address?.name ?? o?.cpf_name ?? null,
      });
    }
  }

  return [...byOrder.entries()].map(([id, c]) => {
    const t = totals.get(id);
    const role = String(c?.role ?? "").toUpperCase();
    return {
      channel: "tiktok_shop" as const,
      id,
      date: new Date(num(c?.create_time) * 1000).toISOString(),
      total: t?.total ?? 0,
      reason: c?.cancel_reason_text ?? c?.cancel_reason ?? null,
      cancelledBy: role ? (TIKTOK_CANCEL_BY[role] ?? role) : null,
      customer: t?.customer ?? null,
    };
  });
}

/**
 * A Shein não tem status "cancelado" próprio: o cancelamento aparece como
 * 6 (reembolsado) ou 9 (recusado).
 */
const SHEIN_CANCEL_STATUS: Array<[number, string]> = [
  [6, "Reembolsado"],
  [9, "Recusado"],
];

async function cancelledShein(from: string, to: string): Promise<CancelledOrder[]> {
  const meta = new Map<string, { created: string; label: string }>();
  for (const [code, label] of SHEIN_CANCEL_STATUS) {
    const list = await tiopsTool<any>("shein_order_list_range", {
      data_inicio: `${from} 00:00:00`,
      data_fim: `${to} 23:59:59`,
      query_type: 1,
      order_status: code,
    });
    for (const r of list?.data?.pedidos ?? []) {
      if (r?.orderNo)
        meta.set(String(r.orderNo), { created: String(r.orderCreateTime ?? ""), label });
    }
  }

  const out: CancelledOrder[] = [];
  for (const batch of chunk([...meta.keys()].slice(0, 400), 20)) {
    const res = await tiopsTool<any>("shein_order_detail", { params: { orderNoList: batch } });
    for (const o of res?.data?.info ?? []) {
      const no = String(o.orderNo);
      const m = meta.get(no);
      const items: any[] = o.orderGoodsInfoList ?? [];
      out.push({
        channel: "shein",
        id: no,
        // A Shein devolve a data no fuso da China (UTC+8).
        date: new Date(`${(m?.created ?? "").replace(" ", "T") || `${from}T11:00:00`}+08:00`)
          .toISOString(),
        total:
          num(o.productTotalPrice) > 0
            ? num(o.productTotalPrice) -
              num(o.promotionDiscountTotalPrice) -
              num(o.storeDiscountTotalPrice)
            : items.reduce((s, g) => s + num(g?.sellerCurrencyDiscountPrice), 0),
        reason: m?.label ?? null,
        cancelledBy: null,
        customer: null,
      });
    }
  }
  return out;
}

const CANCEL_FETCHERS: Record<ChannelId, (from: string, to: string) => Promise<CancelledOrder[]>> =
  {
    meli: cancelledMeli,
    shopee: cancelledShopee,
    tiktok_shop: cancelledTiktok,
    shein: cancelledShein,
  };

export async function fetchChannelCancellations(
  channel: ChannelId,
  from: string,
  to: string,
  todayIso: string,
): Promise<ChannelCancellations> {
  const maxDay = channelMaxDay(channel, todayIso);
  const cappedTo = to > maxDay ? maxDay : to;
  const cappedFrom = from > cappedTo ? cappedTo : from;
  try {
    const cancelled = await CANCEL_FETCHERS[channel](cappedFrom, cappedTo);
    return { channel, from: cappedFrom, to: cappedTo, cancelled, error: null };
  } catch (e) {
    return { channel, from: cappedFrom, to: cappedTo, cancelled: [], error: msg(e) };
  }
}

/* ----------------------------------- Afiliados ------------------------------------- */

/**
 * Shopee: o relatório de conversão do AMS entrega pedido a pedido, com o afiliado
 * que gerou a venda. Agrupamos por afiliado dentro do período pedido.
 */
async function affiliatesShopee(from: string, to: string): Promise<Affiliate[]> {
  const start = startUnix(from);
  const end = endUnix(to);
  const rows: any[] = [];

  for (let page = 1; page <= 20; page++) {
    const res = await tiopsTool<any>("shopee_ams_conversion_report", {
      page_no: page,
      page_size: 100,
      place_order_time_start: start,
      place_order_time_end: end,
    });
    const err = payloadError(res);
    if (err) throw new Error(err);
    const r = res?.data?.response;
    rows.push(...(r?.list ?? []));
    if (!r?.has_more) break;
  }

  // Cliques só existem no relatório agregado do AMS (janela fixa da Shopee).
  const clicksById = new Map<string, number>();
  try {
    const perf = await tiopsTool<any>("shopee_ams_affiliate_performance", {
      period_type: "Last30d",
      start_date: from.replace(/-/g, ""),
      end_date: to.replace(/-/g, ""),
      page_no: 1,
      page_size: 100,
      order_type: "ConfirmedOrder",
      channel: "AllChannel",
    });
    for (const a of perf?.data?.response?.list ?? [])
      clicksById.set(String(a.affiliate_id), num(a.clicks));
  } catch {
    // sem cliques: o resto do relatório continua válido
  }

  const map = new Map<string, Affiliate>();
  for (const o of rows) {
    const id = String(o.affiliate_id ?? "");
    if (!id) continue;
    const cancelled = String(o.order_status ?? "").toLowerCase() === "cancelled";
    if (cancelled) continue;
    const cur =
      map.get(id) ??
      ({
        channel: "shopee",
        id,
        name: String(o.affiliate_name ?? o.affiliate_username ?? "Afiliado"),
        username: o.affiliate_username ? String(o.affiliate_username) : null,
        orders: 0,
        itemsSold: 0,
        sales: 0,
        commission: 0,
        clicks: clicksById.get(id) ?? null,
      } satisfies Affiliate);
    cur.orders += 1;
    for (const it of o.items ?? []) {
      const qty = num(it?.qty);
      const value = num(it?.price) * qty;
      cur.itemsSold += qty;
      cur.sales += value;
      // Quando a comissão ainda não foi confirmada, usamos a taxa acordada do item.
      const confirmed = num(it?.item_brand_commission_to_affiliate);
      cur.commission += confirmed > 0 ? confirmed : (value * num(it?.item_brand_commission_rate_to_affiliate)) / 100;
    }
    map.set(id, cur);
  }

  return [...map.values()].sort((a, b) => b.sales - a.sales);
}

/** TikTok Shop: exige o escopo de afiliados/criadores no app da loja. */
async function affiliatesTiktok(): Promise<Affiliate[]> {
  const res = await tiopsTool<any>("tiktok_seller_creators", {});
  const err = payloadError(res);
  if (err) throw new Error(err);
  const data = res?.data ?? res;
  return (data?.creators ?? data?.seller_creators ?? []).map((c: any) => ({
    channel: "tiktok_shop" as const,
    id: String(c?.creator_id ?? c?.id ?? ""),
    name: String(c?.nickname ?? c?.creator_name ?? "Criador"),
    username: c?.username ? String(c.username) : null,
    orders: num(c?.orders ?? c?.order_count),
    itemsSold: num(c?.items_sold ?? c?.sku_orders),
    sales: num(c?.gmv?.amount ?? c?.gmv),
    commission: num(c?.commission?.amount ?? c?.commission),
    clicks: null,
  }));
}

export async function fetchChannelAffiliates(
  channel: "shopee" | "tiktok_shop",
  from: string,
  to: string,
  todayIso: string,
): Promise<ChannelAffiliates> {
  const maxDay = channelMaxDay(channel, todayIso);
  const cappedTo = to > maxDay ? maxDay : to;
  const cappedFrom = from > cappedTo ? cappedTo : from;
  try {
    const affiliates =
      channel === "shopee"
        ? await affiliatesShopee(cappedFrom, cappedTo)
        : await affiliatesTiktok();
    return { channel, affiliates, error: null };
  } catch (e) {
    return { channel, affiliates: [], error: msg(e) };
  }
}
