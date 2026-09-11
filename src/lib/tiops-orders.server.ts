import { tiopsTool } from "./tiops.server";

export type ChannelId = "meli" | "shopee" | "tiktok_shop" | "shein";

export type NormalizedOrder = {
  channel: ChannelId;
  id: string;
  date: string; // ISO
  status: string;
  cancelled: boolean;
  total: number;
  customer: string | null;
  items: Array<{ name: string; qty: number; price: number }>;
};

export type ChannelResult = {
  channel: ChannelId;
  from: string;
  to: string;
  orders: NormalizedOrder[];
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
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : 0;
  return Number.isFinite(n) ? n : 0;
}
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/* ---------------------------------- Mercado Livre --------------------------------- */

async function fetchMeli(from: string, to: string): Promise<NormalizedOrder[]> {
  const orders: NormalizedOrder[] = [];
  const limit = 50;
  for (let offset = 0; offset < 500; offset += limit) {
    const res = await tiopsTool<any>("list_orders", {
      date_from: `${from}T00:00:00.000${BRT}`,
      date_to: `${to}T23:59:59.000${BRT}`,
      limit,
      offset,
    });
    const results: any[] = res?.data?.results ?? [];
    for (const o of results) {
      const status = String(o.status ?? "");
      orders.push({
        channel: "meli",
        id: String(o.id),
        date: new Date(o.date_created).toISOString(),
        status,
        cancelled: status === "cancelled",
        total: num(o.total_amount),
        customer: o?.buyer?.nickname ?? null,
        items: (o.order_items ?? []).map((it: any) => ({
          name: it?.item?.title ?? "Item",
          qty: num(it?.quantity) || 1,
          price: num(it?.unit_price),
        })),
      });
    }
    if (results.length < limit) break;
  }
  return orders;
}

/* -------------------------------------- Shopee ------------------------------------- */

async function fetchShopee(from: string, to: string): Promise<NormalizedOrder[]> {
  const snList: string[] = [];
  // A Shopee aceita no máximo 15 dias por chamada.
  const startAll = startUnix(from);
  const endAll = endUnix(to);
  const WINDOW = 15 * 86_400;

  for (let ws = startAll; ws <= endAll; ws += WINDOW) {
    const we = Math.min(ws + WINDOW - 1, endAll);
    let cursor = "";
    for (let page = 0; page < 20; page++) {
      const res = await tiopsTool<any>("shopee_list_orders", {
        params: {
          time_range_field: "create_time",
          time_from: ws,
          time_to: we,
          page_size: 100,
          ...(cursor ? { cursor } : {}),
        },
      });
      const r = res?.data?.response;
      for (const o of r?.order_list ?? []) if (o?.order_sn) snList.push(String(o.order_sn));
      if (!r?.more || !r?.next_cursor) break;
      cursor = String(r.next_cursor);
    }
  }

  const orders: NormalizedOrder[] = [];
  for (const batch of chunk(snList, 40)) {
    const res = await tiopsTool<any>("shopee_get_order_detail", { order_sn: batch.join(",") });
    for (const o of res?.data?.response?.order_list ?? []) {
      const status = String(o.order_status ?? "");
      orders.push({
        channel: "shopee",
        id: String(o.order_sn),
        date: new Date(num(o.create_time) * 1000).toISOString(),
        status,
        cancelled: status === "CANCELLED" || status === "UNPAID",
        total: num(o.total_amount),
        customer: o.buyer_username ? String(o.buyer_username) : null,
        items: (o.item_list ?? []).map((it: any) => ({
          name: it?.item_name ?? "Item",
          qty: num(it?.model_quantity_purchased) || 1,
          price: num(it?.model_discounted_price),
        })),
      });
    }
  }
  return orders;
}

/* ------------------------------------ TikTok Shop ---------------------------------- */

async function fetchTiktok(from: string, to: string): Promise<NormalizedOrder[]> {
  const orders: NormalizedOrder[] = [];
  let token = "";
  for (let page = 0; page < 30; page++) {
    const res = await tiopsTool<any>("tiktok_search_orders", {
      create_time_ge: startUnix(from),
      create_time_lt: endUnix(to) + 1,
      page_size: 50,
      ...(token ? { page_token: token } : {}),
    });
    const data = res?.data ?? res;
    for (const o of data?.orders ?? []) {
      const status = String(o.status ?? "");
      orders.push({
        channel: "tiktok_shop",
        id: String(o.id),
        date: new Date(num(o.create_time) * 1000).toISOString(),
        status,
        cancelled: status === "CANCELLED",
        total: num(o?.payment?.total_amount),
        customer: o?.recipient_address?.name ?? o?.cpf_name ?? null,
        items: (o.line_items ?? []).map((it: any) => ({
          name: it?.product_name ?? "Item",
          qty: 1,
          price: num(it?.sale_price),
        })),
      });
    }
    if (!data?.next_page_token) break;
    token = String(data.next_page_token);
  }
  return orders;
}

/* --------------------------------------- Shein ------------------------------------- */

async function fetchShein(from: string, to: string): Promise<NormalizedOrder[]> {
  const list = await tiopsTool<any>("shein_order_list_range", {
    data_inicio: `${from} 00:00:00`,
    data_fim: `${to} 23:59:59`,
    query_type: 1,
  });
  const rows: any[] = list?.data?.pedidos ?? [];
  const byNo = new Map<string, any>();
  for (const r of rows) if (r?.orderNo) byNo.set(String(r.orderNo), r);

  const orders: NormalizedOrder[] = [];
  for (const batch of chunk([...byNo.keys()].slice(0, 600), 20)) {
    const res = await tiopsTool<any>("shein_order_detail", { params: { orderNoList: batch } });
    for (const o of res?.data?.info ?? []) {
      const no = String(o.orderNo);
      const meta = byNo.get(no);
      const items = (o.orderGoodsInfoList ?? []).map((g: any) => ({
        name: g?.goodsTitle ?? "Item",
        qty: 1,
        price: num(g?.sellerCurrencyDiscountPrice),
      }));
      const status = String(o.orderStatus ?? meta?.orderStatus ?? "");
      orders.push({
        channel: "shein",
        id: no,
        date: new Date(
          `${(meta?.orderCreateTime ?? "").replace(" ", "T") || `${from}T00:00:00`}${BRT}`,
        ).toISOString(),
        status,
        cancelled: status === "6",
        total: items.reduce((s: number, i: any) => s + i.price * i.qty, 0),
        customer: null,
        items,
      });
    }
  }
  return orders;
}

/* ------------------------------------- Orquestração -------------------------------- */

const FETCHERS: Record<ChannelId, (from: string, to: string) => Promise<NormalizedOrder[]>> = {
  meli: fetchMeli,
  shopee: fetchShopee,
  tiktok_shop: fetchTiktok,
  shein: fetchShein,
};

/** Limite de dados confiáveis: D-1 em todos os canais (o dia corrente nunca entra). */
export function channelMaxDay(_channel: ChannelId, todayIso: string): string {
  const d = new Date(`${todayIso}T12:00:00Z`);
  return new Date(d.getTime() - 86_400_000).toISOString().slice(0, 10);
}

export async function fetchChannelOrders(
  channel: ChannelId,
  from: string,
  to: string,
  todayIso: string,
): Promise<ChannelResult> {
  const maxDay = channelMaxDay(channel, todayIso);
  const cappedTo = to > maxDay ? maxDay : to;
  // Período inteiro além do limite do canal (ex.: "Dia" na Shein): desloca para o último dia válido.
  const cappedFrom = from > cappedTo ? cappedTo : from;
  try {
    const orders = await FETCHERS[channel](cappedFrom, cappedTo);
    return { channel, from: cappedFrom, to: cappedTo, orders, error: null };
  } catch (e) {
    return {
      channel,
      from: cappedFrom,
      to: cappedTo,
      orders: [],
      error: e instanceof Error ? e.message : "Falha ao consultar o canal",
    };
  }
}
