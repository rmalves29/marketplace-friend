import { tiopsTool } from "./tiops.server";
import type { ChannelId } from "./tiops-orders.server";

export type CatalogProduct = {
  channel: ChannelId;
  id: string;
  title: string;
  sku: string | null;
  price: number;
  stock: number | null;
  status: string;
};

export type ChannelProducts = {
  channel: ChannelId;
  products: CatalogProduct[];
  error: string | null;
};

export type InboxMessage = {
  channel: ChannelId;
  id: string;
  from: string | null;
  text: string;
  date: string | null;
  answered: boolean;
  kind: string;
};

export type ChannelMessages = {
  channel: ChannelId;
  messages: InboxMessage[];
  error: string | null;
};

export type AdsCampaign = {
  channel: ChannelId;
  id: string;
  name: string;
  status: string;
  spend: number | null;
  revenue: number | null;
  clicks: number | null;
  impressions: number | null;
};

export type ChannelAds = {
  channel: ChannelId;
  campaigns: AdsCampaign[];
  error: string | null;
};

function num(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : 0;
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
/** Erro textual devolvido pelo próprio Tiops dentro do payload (403/400 etc.). */
function payloadError(res: any): string | null {
  if (res?.error && typeof res.error === "string") return res.error;
  if (res?.data?.error && typeof res.data.error === "string") return res.data.error;
  return null;
}

/* ------------------------------------- Produtos ------------------------------------ */

const MAX_PRODUCTS = 120;

async function productsMeli(): Promise<CatalogProduct[]> {
  const out: CatalogProduct[] = [];
  const limit = 50;
  for (let offset = 0; offset < MAX_PRODUCTS; offset += limit) {
    const res = await tiopsTool<any>("list_items", { limit, offset });
    const results: any[] = res?.data?.results ?? [];
    for (const r of results) {
      const b = r?.body ?? r;
      if (!b?.id) continue;
      out.push({
        channel: "meli",
        id: String(b.id),
        title: String(b.title ?? "Anúncio"),
        sku: b.seller_custom_field ? String(b.seller_custom_field) : null,
        price: num(b.price),
        stock: b.available_quantity == null ? null : num(b.available_quantity),
        status: String(b.status ?? ""),
      });
    }
    if (results.length < limit) break;
  }
  return out;
}

async function productsShopee(): Promise<CatalogProduct[]> {
  const ids: number[] = [];
  let offset = 0;
  for (let page = 0; page < 3; page++) {
    const res = await tiopsTool<any>("shopee_list_items", { page_size: 50, offset });
    const r = res?.data?.response ?? res?.response;
    for (const it of r?.item ?? []) if (it?.item_id) ids.push(Number(it.item_id));
    if (!r?.has_next_page) break;
    offset = num(r?.next_offset);
  }

  const out: CatalogProduct[] = [];
  for (const batch of chunk(ids.slice(0, MAX_PRODUCTS), 40)) {
    const res = await tiopsTool<any>("shopee_get_items_batch", { item_id_list: batch });
    for (const it of res?.data?.response?.item_list ?? []) {
      const price =
        num(it?.price_info?.[0]?.current_price) || num(it?.price_info?.[0]?.original_price);
      const stock =
        it?.stock_info_v2?.summary_info?.total_available_stock ??
        it?.stock_info_v2?.summary_info?.total_reserved_stock;
      out.push({
        channel: "shopee",
        id: String(it.item_id),
        title: String(it.item_name ?? "Anúncio"),
        sku: it.item_sku ? String(it.item_sku) : null,
        price,
        stock: stock == null ? null : num(stock),
        status: String(it.item_status ?? ""),
      });
    }
  }
  return out;
}

async function productsTiktok(): Promise<CatalogProduct[]> {
  const out: CatalogProduct[] = [];
  let token = "";
  for (let page = 0; page < 3; page++) {
    const res = await tiopsTool<any>("tiktok_search_products", {
      page_size: 50,
      ...(token ? { page_token: token } : {}),
    });
    const data = res?.data ?? res;
    for (const p of data?.products ?? []) {
      const sku = (p?.skus ?? [])[0];
      const stock = (sku?.inventory ?? []).reduce((s: number, i: any) => s + num(i?.quantity), 0);
      out.push({
        channel: "tiktok_shop",
        id: String(p.id),
        title: String(p.title ?? "Produto"),
        sku: sku?.seller_sku ? String(sku.seller_sku) : null,
        price: num(sku?.price?.tax_exclusive_price),
        stock,
        status: String(p.status ?? ""),
      });
    }
    if (!data?.next_page_token || out.length >= MAX_PRODUCTS) break;
    token = String(data.next_page_token);
  }
  return out.slice(0, MAX_PRODUCTS);
}

async function productsShein(): Promise<CatalogProduct[]> {
  const out: CatalogProduct[] = [];
  for (let pageNum = 1; pageNum <= 6; pageNum++) {
    const res = await tiopsTool<any>("shein_product_list", { pageNum, pageSize: 10 });
    const rows: any[] = res?.data?.info?.data ?? [];
    for (const spu of rows) {
      const skc = (spu?.skcList ?? [])[0];
      const title = (skc?.skcTitle ?? [])[0]?.title ?? spu?.spuName ?? "Produto";
      const price = num((skc?.skuList ?? [])[0]?.priceList?.[0]?.basePrice);
      out.push({
        channel: "shein",
        id: String(spu?.spuName ?? skc?.skcName ?? ""),
        title: String(title),
        sku: skc?.skcName ? String(skc.skcName) : null,
        price,
        stock: null,
        status: String(spu?.spuShelfStatus ?? ""),
      });
    }
    if (rows.length < 10) break;
  }
  return out;
}

const PRODUCT_FETCHERS: Record<ChannelId, () => Promise<CatalogProduct[]>> = {
  meli: productsMeli,
  shopee: productsShopee,
  tiktok_shop: productsTiktok,
  shein: productsShein,
};

export async function fetchChannelProducts(channel: ChannelId): Promise<ChannelProducts> {
  try {
    return { channel, products: await PRODUCT_FETCHERS[channel](), error: null };
  } catch (e) {
    return { channel, products: [], error: msg(e) };
  }
}

/* ------------------------------------- Mensagens ----------------------------------- */

async function messagesMeli(): Promise<InboxMessage[]> {
  const out: InboxMessage[] = [];

  const q = await tiopsTool<any>("ml_list_questions", { limit: 50 });
  for (const item of q?.data?.questions ?? []) {
    out.push({
      channel: "meli",
      id: String(item.id),
      from: item?.from?.id ? `Comprador ${item.from.id}` : null,
      text: String(item.text ?? ""),
      date: item.date_created ? new Date(item.date_created).toISOString() : null,
      answered: Boolean(item.answer),
      kind: "Pergunta no anúncio",
    });
  }

  const unread = await tiopsTool<any>("ml_messages_unread", {});
  for (const r of unread?.data?.results ?? []) {
    out.push({
      channel: "meli",
      id: String(r?.id ?? r?.pack_id ?? Math.random()),
      from: r?.from?.user_id ? `Comprador ${r.from.user_id}` : null,
      text: String(r?.text ?? "Mensagem pós-venda não lida"),
      date: r?.message_date?.created ? new Date(r.message_date.created).toISOString() : null,
      answered: false,
      kind: "Mensagem pós-venda",
    });
  }

  return out;
}

async function messagesTiktok(): Promise<InboxMessage[]> {
  const res = await tiopsTool<any>("tiktok_list_conversations", { page_size: 20 });
  const err = payloadError(res);
  if (err) throw new Error(err);
  const data = res?.data ?? res;
  return (data?.conversations ?? []).map((c: any) => ({
    channel: "tiktok_shop" as const,
    id: String(c?.id ?? ""),
    from: c?.participants?.[0]?.nickname ?? null,
    text: String(c?.latest_message?.content ?? "Conversa aberta"),
    date: c?.latest_message?.create_time
      ? new Date(num(c.latest_message.create_time) * 1000).toISOString()
      : null,
    answered: num(c?.unread_count) === 0,
    kind: "Conversa TikTok Shop",
  }));
}

export async function fetchChannelMessages(
  channel: "meli" | "tiktok_shop",
): Promise<ChannelMessages> {
  try {
    const messages = channel === "meli" ? await messagesMeli() : await messagesTiktok();
    return { channel, messages, error: null };
  } catch (e) {
    return { channel, messages: [], error: msg(e) };
  }
}

/* -------------------------------------- Anúncios ----------------------------------- */

async function adsMeli(): Promise<AdsCampaign[]> {
  const accRes = await tiopsTool<any>("ml_ads_accounts", {});
  const err = payloadError(accRes);
  if (err) throw new Error(err);
  const advertisers: any[] = accRes?.data?.advertisers ?? accRes?.data?.results ?? [];
  const out: AdsCampaign[] = [];
  for (const a of advertisers.slice(0, 3)) {
    const res = await tiopsTool<any>("ml_ads_campaigns_metrics", {
      advertiser_id: String(a?.advertiser_id ?? a?.id ?? ""),
    });
    for (const c of res?.data?.results ?? res?.data?.campaigns ?? []) {
      const m = c?.metrics_summary ?? c?.metrics ?? {};
      out.push({
        channel: "meli",
        id: String(c?.id ?? ""),
        name: String(c?.name ?? "Campanha"),
        status: String(c?.status ?? ""),
        spend: num(m?.cost),
        revenue: num(m?.direct_amount) + num(m?.indirect_amount),
        clicks: num(m?.clicks),
        impressions: num(m?.prints ?? m?.impressions),
      });
    }
  }
  return out;
}

async function adsShopee(): Promise<AdsCampaign[]> {
  const res = await tiopsTool<any>("shopee_ads_campaigns", {});
  const err = payloadError(res);
  if (err) throw new Error(err);
  const list: any[] =
    res?.data?.response?.campaign_list ?? res?.data?.campaign_list ?? res?.data?.campaigns ?? [];
  return list.map((c: any) => ({
    channel: "shopee" as const,
    id: String(c?.campaign_id ?? ""),
    name: String(c?.campaign_name ?? c?.ad_name ?? "Campanha"),
    status: String(c?.status ?? c?.state ?? ""),
    spend: c?.expense == null ? null : num(c.expense),
    revenue: c?.gmv == null ? null : num(c.gmv),
    clicks: c?.click == null ? null : num(c.click),
    impressions: c?.impression == null ? null : num(c.impression),
  }));
}

async function adsTiktok(): Promise<AdsCampaign[]> {
  const res = await tiopsTool<any>("tiktok_search_promotions", { page_size: 20 });
  const err = payloadError(res);
  if (err) throw new Error(err);
  const data = res?.data ?? res;
  return (data?.promotions ?? data?.activities ?? []).map((p: any) => ({
    channel: "tiktok_shop" as const,
    id: String(p?.id ?? ""),
    name: String(p?.title ?? p?.activity_name ?? "Promoção"),
    status: String(p?.status ?? ""),
    spend: null,
    revenue: null,
    clicks: null,
    impressions: null,
  }));
}

const ADS_FETCHERS: Record<"meli" | "shopee" | "tiktok_shop", () => Promise<AdsCampaign[]>> = {
  meli: adsMeli,
  shopee: adsShopee,
  tiktok_shop: adsTiktok,
};

export async function fetchChannelAds(
  channel: "meli" | "shopee" | "tiktok_shop",
): Promise<ChannelAds> {
  try {
    return { channel, campaigns: await ADS_FETCHERS[channel](), error: null };
  } catch (e) {
    return { channel, campaigns: [], error: msg(e) };
  }
}
