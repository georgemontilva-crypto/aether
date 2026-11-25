import { mysqlTable, int, varchar, text, decimal, boolean, timestamp, mysqlEnum, index } from "drizzle-orm/mysql-core";

export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  name: varchar("name", { length: 80 }).notNull(),
  sortOrder: int("sort_order").notNull().default(0),
});

export const products = mysqlTable(
  "products",
  {
    id: int("id").autoincrement().primaryKey(),
    slug: varchar("slug", { length: 120 }).notNull().unique(),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description"),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    categoryId: int("category_id").notNull(),
    /** hashtags separados por coma, en minúsculas y sin "#" */
    tags: varchar("tags", { length: 600 }).notNull().default(""),
    /** tallas / variantes separadas por coma (opcional) */
    options: varchar("options", { length: 300 }).notNull().default(""),
    stock: int("stock").notNull().default(0),
    active: boolean("active").notNull().default(true),
    featured: boolean("featured").notNull().default(false),
    odooId: int("odoo_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [index("products_category_idx").on(t.categoryId)],
);

export const productImages = mysqlTable(
  "product_images",
  {
    id: int("id").autoincrement().primaryKey(),
    productId: int("product_id").notNull(),
    url: varchar("url", { length: 600 }).notNull(),
    thumbUrl: varchar("thumb_url", { length: 600 }).notNull(),
    /** clave en el almacenamiento propio (R2). null = la foto todavía vive fuera (Odoo / seed) */
    storageKey: varchar("storage_key", { length: 300 }),
    sortOrder: int("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("product_images_product_idx").on(t.productId)],
);

export const orders = mysqlTable(
  "orders",
  {
    id: int("id").autoincrement().primaryKey(),
    code: varchar("code", { length: 20 }).notNull().unique(),
    customerName: varchar("customer_name", { length: 120 }).notNull(),
    customerPhone: varchar("customer_phone", { length: 40 }).notNull(),
    paymentMethod: varchar("payment_method", { length: 80 }).notNull(),
    note: varchar("note", { length: 500 }).notNull().default(""),
    total: decimal("total", { precision: 10, scale: 2 }).notNull(),
    status: mysqlEnum("status", ["pendiente", "confirmado", "cancelado"]).notNull().default("pendiente"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [index("orders_status_idx").on(t.status)],
);

export const orderItems = mysqlTable(
  "order_items",
  {
    id: int("id").autoincrement().primaryKey(),
    orderId: int("order_id").notNull(),
    productId: int("product_id"),
    name: varchar("name", { length: 160 }).notNull(),
    option: varchar("option", { length: 80 }).notNull().default(""),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    qty: int("qty").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

/** Historial de entradas y salidas de inventario. */
export const stockMovements = mysqlTable(
  "stock_movements",
  {
    id: int("id").autoincrement().primaryKey(),
    productId: int("product_id").notNull(),
    delta: int("delta").notNull(),
    stockAfter: int("stock_after").notNull(),
    reason: varchar("reason", { length: 120 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("stock_movements_product_idx").on(t.productId)],
);

export const settings = mysqlTable("settings", {
  key: varchar("key", { length: 60 }).primaryKey(),
  value: text("value").notNull(),
});
