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

/** A conta "atual" do Tiops pode apontar para uma loja antiga; usamos a conta meli conectada. */
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

async function fetchMeli(from: string, to: string): Promise<NormalizedOrder[]> {
  const orders: NormalizedOrder[] = [];
  const limit = 50;
  const userId = await meliUserId();
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
  const paidFrom = startUnix(from);
  const paidTo = endUnix(to);
  // A Shopee aceita no máximo 15 dias por chamada.
  // O painel do vendedor agrupa pela data do pagamento. Como a API só filtra
  // a listagem pela criação, buscamos uma margem para capturar pagamentos posteriores.
  const startAll = paidFrom - 3 * 86_400;
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
      const paidAt = num(o.pay_time);
      if (paidAt < paidFrom || paidAt > paidTo) continue;
      const status = String(o.order_status ?? "");
      const items = (o.item_list ?? []).map((it: any) => ({
        name: it?.item_name ?? "Item",
        qty: num(it?.model_quantity_purchased) || 1,
        price: num(it?.model_discounted_price),
      }));
      orders.push({
        channel: "shopee",
        id: String(o.order_sn),
        date: new Date(paidAt * 1000).toISOString(),
        status,
        // O painel mantém na venda do dia pedidos pagos que foram cancelados depois.
        cancelled: false,
        // O painel de vendas soma os produtos no preço efetivamente pago.
        total: items.reduce((sum: number, item: { qty: number; price: number }) => {
          return sum + item.qty * item.price;
        }, 0),
        customer: o.buyer_username ? String(o.buyer_username) : null,
        items,
      });
    }
  }
  return orders;
}

/* ------------------------------------ TikTok Shop ---------------------------------- */

async function fetchTiktok(from: string, to: string): Promise<NormalizedOrder[]> {
  const orders: NormalizedOrder[] = [];
  const paidFrom = startUnix(from);
  const paidTo = endUnix(to);
  let token = "";
  for (let page = 0; page < 30; page++) {
    const res = await tiopsTool<any>("tiktok_search_orders", {
      // O endpoint só filtra por criação, embora o painel consolide por pagamento.
      create_time_ge: paidFrom - 3 * 86_400,
      create_time_lt: endUnix(to) + 1,
      page_size: 50,
      ...(token ? { page_token: token } : {}),
    });
    const data = res?.data ?? res;
    for (const o of data?.orders ?? []) {
      const paidAt = num(o.paid_time ?? o?.payment?.paid_time);
      if (paidAt < paidFrom || paidAt > paidTo) continue;
      const status = String(o.status ?? "");
      orders.push({
        channel: "tiktok_shop",
        id: String(o.id),
        date: new Date(paidAt * 1000).toISOString(),
        status,
        // Cancelamentos posteriores não alteram retroativamente o painel do dia pago.
        cancelled: false,
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
        // A Shein devolve a data de criação no fuso da China (UTC+8), mesmo filtrando em BRT.
        date: new Date(
          `${(meta?.orderCreateTime ?? "").replace(" ", "T") || `${from}T11:00:00`}+08:00`,
        ).toISOString(),
        status,
        cancelled: status === "6",
        // Valor de venda: preço dos produtos menos descontos de loja/promoção.
        total:
          num(o.productTotalPrice) > 0
            ? num(o.productTotalPrice) -
              num(o.promotionDiscountTotalPrice) -
              num(o.storeDiscountTotalPrice)
            : items.reduce((s: number, i: any) => s + i.price * i.qty, 0),
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
