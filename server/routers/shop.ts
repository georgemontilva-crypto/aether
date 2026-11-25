import { TRPCError } from "@trpc/server";
import { asc, desc, eq, inArray } from "drizzle-orm";
import crypto from "node:crypto";
import { z } from "zod";
import { db } from "../db";
import { env } from "../env";
import { categories, orderItems, orders, productImages, products } from "../schema";
import { getSettings } from "../settings";
import { publicProcedure, router } from "../trpc";
import { buildMessage, whatsappUrl, type Receipt } from "../whatsapp";
import { parseList } from "../../shared/text";

export type CatalogProduct = Awaited<ReturnType<typeof loadProducts>>[number];

export async function loadProducts(opts: { onlyActive: boolean }) {
  const rows = await db
    .select()
    .from(products)
    .where(opts.onlyActive ? eq(products.active, true) : undefined)
    .orderBy(desc(products.createdAt), desc(products.id));
  const imgs = rows.length
    ? await db.select().from(productImages).where(inArray(productImages.productId, rows.map((r) => r.id))).orderBy(asc(productImages.sortOrder), asc(productImages.id))
    : [];
  return rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description ?? "",
    price: Number(p.price),
    categoryId: p.categoryId,
    tags: parseList(p.tags),
    options: parseList(p.options),
    stock: p.stock,
    active: p.active,
    featured: p.featured,
    createdAt: p.createdAt.getTime(),
    images: imgs.filter((i) => i.productId === p.id).map((i) => ({ id: i.id, url: i.url, thumbUrl: i.thumbUrl, storageKey: i.storageKey })),
  }));
}

export async function loadReceipt(code: string): Promise<(Receipt & { status: string; createdAt: number }) | null> {
  const [o] = await db.select().from(orders).where(eq(orders.code, code)).limit(1);
  if (!o) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, o.id));
  return {
    code: o.code,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    paymentMethod: o.paymentMethod,
    note: o.note,
    total: Number(o.total),
    status: o.status,
    createdAt: o.createdAt.getTime(),
    items: items.map((i) => ({ name: i.name, option: i.option, price: Number(i.price), qty: i.qty })),
  };
}

const orderUrl = (code: string) => (env.publicUrl ? `${env.publicUrl}/pedido/${code}` : "");

export const shopRouter = router({
  /** Todo lo que necesita la tienda en una sola llamada. */
  catalog: publicProcedure.query(async () => {
    const [s, cats, prods] = await Promise.all([
      getSettings(),
      db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.id)),
      loadProducts({ onlyActive: true }),
    ]);
    return { settings: s, categories: cats, products: prods };
  }),

  createOrder: publicProcedure
    .input(
      z.object({
        name: z.string().trim().min(2, "Escribe tu nombre").max(120),
        phone: z.string().trim().min(7, "Escribe tu número de teléfono").max(40),
        paymentMethod: z.string().trim().min(1, "Elige un método de pago").max(80),
        note: z.string().trim().max(500).default(""),
        items: z.array(z.object({ productId: z.number().int(), qty: z.number().int().min(1).max(99), option: z.string().max(80).default("") })).min(1).max(60),
      }),
    )
    .mutation(async ({ input }) => {
      const s = await getSettings();
      if (!s.paymentMethods.includes(input.paymentMethod)) throw new TRPCError({ code: "BAD_REQUEST", message: "Método de pago no disponible" });

      const rows = await db.select().from(products).where(inArray(products.id, input.items.map((i) => i.productId)));
      const wanted = new Map<number, number>();
      for (const i of input.items) wanted.set(i.productId, (wanted.get(i.productId) ?? 0) + i.qty);

      // Precios y existencias se validan aquí: nunca se confía en lo que manda el navegador.
      const lines = input.items.map((i) => {
        const p = rows.find((r) => r.id === i.productId && r.active);
        if (!p) throw new TRPCError({ code: "BAD_REQUEST", message: "Uno de los productos ya no está disponible. Revisa tu carrito." });
        const need = wanted.get(p.id)!;
        if (p.stock < need) {
          throw new TRPCError({ code: "CONFLICT", message: p.stock === 0 ? `"${p.name}" se agotó.` : `De "${p.name}" solo ${p.stock === 1 ? "queda 1 pieza" : `quedan ${p.stock} piezas`}.` });
        }
        const opts = parseList(p.options);
        if (opts.length && !opts.includes(i.option)) throw new TRPCError({ code: "BAD_REQUEST", message: `Elige una opción para "${p.name}".` });
        return { productId: p.id, name: p.name, option: opts.length ? i.option : "", price: Number(p.price), qty: i.qty };
      });
      const total = Math.round(lines.reduce((a, l) => a + l.price * l.qty, 0) * 100) / 100;

      const code = await db.transaction(async (tx) => {
        const [res] = await tx.insert(orders).values({
          code: `tmp-${crypto.randomUUID().slice(0, 12)}`,
          customerName: input.name,
          customerPhone: input.phone,
          paymentMethod: input.paymentMethod,
          note: input.note,
          total: total.toFixed(2),
        });
        // Número correlativo + sufijo al azar: fácil de dictar, imposible de adivinar el de otro cliente.
        const suffix = Array.from(crypto.randomBytes(4), (b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");
        const finalCode = `${1000 + res.insertId}-${suffix}`;
        await tx.update(orders).set({ code: finalCode }).where(eq(orders.id, res.insertId));
        await tx.insert(orderItems).values(lines.map((l) => ({ ...l, orderId: res.insertId, price: l.price.toFixed(2) })));
        return finalCode;
      });

      const receipt: Receipt = { code, customerName: input.name, customerPhone: input.phone, paymentMethod: input.paymentMethod, note: input.note, total, items: lines };
      return { code, whatsappUrl: whatsappUrl(s.whatsapp, buildMessage(receipt, orderUrl(code))) };
    }),

  order: publicProcedure.input(z.object({ code: z.string().min(6).max(20) })).query(async ({ input }) => {
    const receipt = await loadReceipt(input.code);
    if (!receipt) throw new TRPCError({ code: "NOT_FOUND", message: "No encontramos ese pedido" });
    const s = await getSettings();
    return { ...receipt, whatsappUrl: whatsappUrl(s.whatsapp, buildMessage(receipt, orderUrl(receipt.code))) };
  }),
});
