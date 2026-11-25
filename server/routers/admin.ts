import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { checkPassword, endSession, loginAllowed, loginFailed, loginSucceeded, startSession } from "../auth";
import { db, type Tx } from "../db";
import { migrateExternalImages, migration, pendingExternalCount, removeStored } from "../images";
import { categories, orderItems, orders, productImages, products, stockMovements } from "../schema";
import { getSettings, saveSettings } from "../settings";
import { storageMode } from "../storage";
import { adminProcedure, publicProcedure, router } from "../trpc";
import { loadProducts } from "./shop";
import { cleanTag, ORDER_STATUSES, slugify } from "../../shared/text";

/** Cambia el stock de un producto y deja el movimiento en el historial. */
async function setStock(tx: Tx, productId: number, next: number, reason: string) {
  const [p] = await tx.select({ stock: products.stock }).from(products).where(eq(products.id, productId)).for("update");
  if (!p) return;
  const stock = Math.max(0, next);
  if (stock === p.stock) return;
  await tx.update(products).set({ stock }).where(eq(products.id, productId));
  await tx.insert(stockMovements).values({ productId, delta: stock - p.stock, stockAfter: stock, reason });
}

async function uniqueSlug(name: string, ignoreId?: number) {
  const base = slugify(name);
  for (let n = 1; ; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const [hit] = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1);
    if (!hit || hit.id === ignoreId) return slug;
  }
}

const productInput = z.object({
  id: z.number().int().optional(),
  name: z.string().trim().min(1, "Ponle un nombre").max(160),
  description: z.string().trim().max(4000).default(""),
  price: z.number().min(0).max(100000),
  categoryId: z.number().int(),
  tags: z.array(z.string()).max(30).default([]),
  options: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  stock: z.number().int().min(0).max(100000),
  active: z.boolean().default(true),
  featured: z.boolean().default(false),
  images: z.array(z.object({ id: z.number().int().optional(), url: z.string().max(600), thumbUrl: z.string().max(600), storageKey: z.string().max(300).nullable() })).max(12).default([]),
});

export const adminRouter = router({
  me: publicProcedure.query(({ ctx }) => ({ admin: ctx.admin })),

  login: publicProcedure.input(z.object({ password: z.string().max(200) })).mutation(async ({ ctx, input }) => {
    const ip = ctx.req.ip ?? "?";
    if (!loginAllowed(ip)) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Demasiados intentos. Espera 15 minutos." });
    if (!checkPassword(input.password)) {
      loginFailed(ip);
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Clave incorrecta" });
    }
    loginSucceeded(ip);
    await startSession(ctx.res);
    return { ok: true };
  }),

  logout: publicProcedure.mutation(({ ctx }) => {
    endSession(ctx.res);
    return { ok: true };
  }),

  /** Productos (incluye ocultos), categorías, ajustes y estado de las fotos: todo el panel sale de aquí. */
  data: adminProcedure.query(async () => {
    const [prods, cats, s, pendingOrders, movements, externalPhotos] = await Promise.all([
      loadProducts({ onlyActive: false }),
      db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.id)),
      getSettings(),
      db.select({ n: sql<number>`count(*)` }).from(orders).where(eq(orders.status, "pendiente")),
      db
        .select({ id: stockMovements.id, delta: stockMovements.delta, stockAfter: stockMovements.stockAfter, reason: stockMovements.reason, createdAt: stockMovements.createdAt, name: products.name })
        .from(stockMovements)
        .leftJoin(products, eq(products.id, stockMovements.productId))
        .orderBy(desc(stockMovements.id))
        .limit(12),
      pendingExternalCount(),
    ]);
    return {
      products: prods,
      categories: cats,
      settings: s,
      pendingOrders: Number(pendingOrders[0]?.n ?? 0),
      movements: movements.map((m) => ({ ...m, name: m.name ?? "(producto eliminado)", createdAt: m.createdAt.getTime() })),
      storage: { mode: storageMode(), externalPhotos, migration: { ...migration } },
    };
  }),

  saveProduct: adminProcedure.input(productInput).mutation(async ({ input }) => {
    const [cat] = await db.select().from(categories).where(eq(categories.id, input.categoryId)).limit(1);
    if (!cat) throw new TRPCError({ code: "BAD_REQUEST", message: "Elige una categoría" });
    const tags = [...new Set(input.tags.map(cleanTag).filter(Boolean))].join(",");
    const options = [...new Set(input.options.map((o) => o.replace(/,/g, " ").trim()))].join(",");
    if (tags.length > 600) throw new TRPCError({ code: "BAD_REQUEST", message: "Demasiados hashtags" });
    const fields = { name: input.name, description: input.description, price: input.price.toFixed(2), categoryId: input.categoryId, tags, options, active: input.active, featured: input.featured };

    const removedKeys: (string | null)[] = [];
    const id = await db.transaction(async (tx) => {
      let productId = input.id;
      if (productId) {
        const [exists] = await tx.select({ id: products.id }).from(products).where(eq(products.id, productId)).limit(1);
        if (!exists) throw new TRPCError({ code: "NOT_FOUND", message: "Ese producto ya no existe" });
        await tx.update(products).set({ ...fields, slug: await uniqueSlug(input.name, productId) }).where(eq(products.id, productId));
        await setStock(tx, productId, input.stock, "Ajuste manual");
      } else {
        const [res] = await tx.insert(products).values({ ...fields, slug: await uniqueSlug(input.name), stock: 0 });
        productId = res.insertId;
        await setStock(tx, productId, input.stock, "Stock inicial");
      }
      // Fotos: se borran las que ya no vienen, se agregan las nuevas y se guarda el orden.
      const current = await tx.select().from(productImages).where(eq(productImages.productId, productId));
      const keep = new Set(input.images.map((i) => i.id).filter(Boolean));
      for (const img of current) {
        if (keep.has(img.id)) continue;
        await tx.delete(productImages).where(eq(productImages.id, img.id));
        removedKeys.push(img.storageKey);
      }
      for (const [sortOrder, img] of input.images.entries()) {
        if (img.id && current.some((c) => c.id === img.id)) await tx.update(productImages).set({ sortOrder }).where(eq(productImages.id, img.id));
        else await tx.insert(productImages).values({ productId, url: img.url, thumbUrl: img.thumbUrl, storageKey: img.storageKey, sortOrder });
      }
      return productId;
    });
    await Promise.all(removedKeys.map(removeStored));
    return { id };
  }),

  /** Edición rápida desde la tabla de inventario. */
  setStock: adminProcedure.input(z.object({ id: z.number().int(), stock: z.number().int().min(0).max(100000) })).mutation(async ({ input }) => {
    await db.transaction((tx) => setStock(tx, input.id, input.stock, "Ajuste manual"));
    return { ok: true };
  }),

  setActive: adminProcedure.input(z.object({ id: z.number().int(), active: z.boolean() })).mutation(async ({ input }) => {
    await db.update(products).set({ active: input.active }).where(eq(products.id, input.id));
    return { ok: true };
  }),

  deleteProduct: adminProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => {
    const imgs = await db.select().from(productImages).where(eq(productImages.productId, input.id));
    await db.transaction(async (tx) => {
      await tx.delete(productImages).where(eq(productImages.productId, input.id));
      await tx.delete(stockMovements).where(eq(stockMovements.productId, input.id));
      await tx.delete(products).where(eq(products.id, input.id));
    });
    await Promise.all(imgs.map((i) => removeStored(i.storageKey)));
    return { ok: true };
  }),

  orders: adminProcedure.query(async () => {
    const rows = await db.select().from(orders).where(sql`${orders.code} not like 'tmp-%'`).orderBy(desc(orders.id)).limit(300);
    const items = rows.length ? await db.select().from(orderItems).where(inArray(orderItems.orderId, rows.map((r) => r.id))) : [];
    return rows.map((o) => ({
      id: o.id,
      code: o.code,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      paymentMethod: o.paymentMethod,
      note: o.note,
      total: Number(o.total),
      status: o.status,
      createdAt: o.createdAt.getTime(),
      items: items.filter((i) => i.orderId === o.id).map((i) => ({ name: i.name, option: i.option, price: Number(i.price), qty: i.qty })),
    }));
  }),

  /** Confirmar una venta descuenta el stock; sacarla de "confirmado" lo devuelve. */
  setOrderStatus: adminProcedure.input(z.object({ id: z.number().int(), status: z.enum(ORDER_STATUSES) })).mutation(async ({ input }) => {
    await db.transaction(async (tx) => {
      const [o] = await tx.select().from(orders).where(eq(orders.id, input.id)).for("update");
      if (!o) throw new TRPCError({ code: "NOT_FOUND", message: "Ese pedido ya no existe" });
      if (o.status === input.status) return;
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, o.id));
      const sign = input.status === "confirmado" ? -1 : o.status === "confirmado" ? 1 : 0;
      if (sign) {
        for (const it of items) {
          if (!it.productId) continue;
          const [p] = await tx.select({ stock: products.stock }).from(products).where(eq(products.id, it.productId));
          if (p) await setStock(tx, it.productId, p.stock + sign * it.qty, sign < 0 ? `Venta #${o.code}` : `Venta anulada #${o.code}`);
        }
      }
      await tx.update(orders).set({ status: input.status }).where(eq(orders.id, o.id));
    });
    return { ok: true };
  }),

  saveSettings: adminProcedure
    .input(
      z.object({
        whatsapp: z.string().trim().regex(/^\+?[\d\s-]{8,20}$/, "Número de WhatsApp inválido (con código de país)"),
        paymentMethods: z.array(z.string().trim().min(1).max(80)).min(1, "Deja al menos un método de pago").max(12),
        announcement: z.string().trim().max(200),
        instagram: z.string().trim().max(200),
        tiktok: z.string().trim().max(200),
        facebook: z.string().trim().max(200),
        email: z.string().trim().max(120),
        lowStock: z.number().int().min(0).max(999),
      }),
    )
    .mutation(async ({ input }) => {
      await saveSettings({ ...input, whatsapp: input.whatsapp.replace(/\D/g, "") });
      return { ok: true };
    }),

  saveCategory: adminProcedure.input(z.object({ id: z.number().int().optional(), name: z.string().trim().min(1).max(80) })).mutation(async ({ input }) => {
    const slug = slugify(input.name);
    const [clash] = await db.select().from(categories).where(and(eq(categories.slug, slug), input.id ? ne(categories.id, input.id) : undefined)).limit(1);
    if (clash) throw new TRPCError({ code: "CONFLICT", message: "Ya existe una categoría con ese nombre" });
    if (input.id) await db.update(categories).set({ name: input.name, slug }).where(eq(categories.id, input.id));
    else {
      const [max] = await db.select({ n: sql<number>`coalesce(max(${categories.sortOrder}), 0)` }).from(categories);
      await db.insert(categories).values({ name: input.name, slug, sortOrder: Number(max.n) + 1 });
    }
    return { ok: true };
  }),

  deleteCategory: adminProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => {
    const [used] = await db.select({ id: products.id }).from(products).where(eq(products.categoryId, input.id)).limit(1);
    if (used) throw new TRPCError({ code: "CONFLICT", message: "Esa categoría tiene productos. Muévelos a otra antes de borrarla." });
    await db.delete(categories).where(eq(categories.id, input.id));
    return { ok: true };
  }),

  migratePhotos: adminProcedure.mutation(() => {
    if (storageMode() === "none") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Primero configura las variables R2_* en Railway." });
    void migrateExternalImages();
    return { ok: true };
  }),
});
