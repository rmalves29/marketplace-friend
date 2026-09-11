import { createServerFn } from "@tanstack/react-start";

export type ChannelId = "meli" | "shopee" | "tiktok_shop" | "shein";

export type DashboardPayload = {
  from: string;
  to: string;
  channels: Array<{
    channel: ChannelId;
    to: string;
    orders: number;
    revenue: number;
    error: string | null;
  }>;
  totals: { orders: number; revenue: number; items: number; averageTicket: number };
  topProducts: Array<{ name: string; qty: number; revenue: number }>;
  customers: Array<{ name: string; channel: ChannelId; orders: number; total: number }>;
  recent: Array<{
    channel: ChannelId;
    id: string;
    date: string;
    status: string;
    total: number;
    customer: string | null;
  }>;
};

export type OrdersPayload = {
  from: string;
  to: string;
  channels: Array<{ channel: ChannelId; to: string; error: string | null }>;
  orders: Array<{
    channel: ChannelId;
    id: string;
    date: string;
    status: string;
    cancelled: boolean;
    total: number;
    customer: string | null;
    itemsCount: number;
    itemNames: string[];
  }>;
};

const RANGE = /^\d{4}-\d{2}-\d{2}$/;


export const tiopsHealth = createServerFn({ method: "GET" }).handler(async () => {
  const { tiopsPing } = await import("./tiops.server");
  try {
    return await tiopsPing();
  } catch (e) {
    return { ok: false, accounts: 0, message: e instanceof Error ? e.message : "Falha" };
  }
});

export const tiopsAccounts = createServerFn({ method: "GET" }).handler(async () => {
  const { tiopsTool } = await import("./tiops.server");
  try {
    const res = await tiopsTool<any>("list_accounts");
    const accounts: any[] = res?.data?.accounts ?? [];
    return {
      error: null as string | null,
      accounts: accounts.map((a) => ({
        marketplace: String(a.marketplace ?? ""),
        externalId: String(a.external_id ?? ""),
        label: String(a.label ?? a.nickname ?? a.marketplace ?? ""),
        connected: Boolean(a.connected),
      })),
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Falha", accounts: [] };
  }
});

export const tiopsDashboard = createServerFn({ method: "POST" })
  .inputValidator((input: { from: string; to: string }) => {
    if (!RANGE.test(input.from) || !RANGE.test(input.to)) throw new Error("Datas inválidas");
    if (input.from > input.to) throw new Error("Início posterior ao fim");
    return input;
  })
  .handler(async ({ data }): Promise<DashboardPayload> => {
    const { fetchChannelOrders } = await import("./tiops-orders.server");
    const todayIso = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
    const ids: ChannelId[] = ["meli", "shopee", "tiktok_shop", "shein"];

    const results = await Promise.all(
      ids.map((c) => fetchChannelOrders(c, data.from, data.to, todayIso)),
    );

    const all = results.flatMap((r) => r.orders).filter((o) => !o.cancelled);

    const productMap = new Map<string, { name: string; qty: number; revenue: number }>();
    let itemCount = 0;
    for (const o of all) {
      for (const it of o.items) {
        itemCount += it.qty;
        const cur = productMap.get(it.name) ?? { name: it.name, qty: 0, revenue: 0 };
        cur.qty += it.qty;
        cur.revenue += it.price * it.qty;
        productMap.set(it.name, cur);
      }
    }

    const customerMap = new Map<
      string,
      { name: string; channel: ChannelId; orders: number; total: number }
    >();
    for (const o of all) {
      if (!o.customer) continue;
      const key = `${o.channel}:${o.customer}`;
      const cur = customerMap.get(key) ?? {
        name: o.customer,
        channel: o.channel,
        orders: 0,
        total: 0,
      };
      cur.orders += 1;
      cur.total += o.total;
      customerMap.set(key, cur);
    }

    const revenue = all.reduce((s, o) => s + o.total, 0);

    return {
      from: data.from,
      to: data.to,
      channels: results.map((r) => {
        const live = r.orders.filter((o) => !o.cancelled);
        return {
          channel: r.channel,
          to: r.to,
          orders: live.length,
          revenue: live.reduce((s, o) => s + o.total, 0),
          error: r.error,
        };
      }),
      totals: {
        orders: all.length,
        revenue,
        items: itemCount,
        averageTicket: all.length ? revenue / all.length : 0,
      },
      topProducts: [...productMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 10),
      customers: [...customerMap.values()].sort((a, b) => b.total - a.total).slice(0, 12),
      recent: all
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 12)
        .map((o) => ({
          channel: o.channel,
          id: o.id,
          date: o.date,
          status: o.status,
          total: o.total,
          customer: o.customer,
        })),
    };
  });
