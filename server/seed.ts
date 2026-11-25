import fs from "node:fs";
import path from "node:path";
import { db } from "./db";
import { categories, products, productImages, settings } from "./schema";
import { SEED_PHOTOS_DIR } from "./images";

type SeedProduct = {
  odooId: number;
  name: string;
  slug: string;
  price: number;
  category: string;
  tags: string[];
  options: string;
  imageHash: string;
};

const CATEGORIES = [
  { slug: "accesorios", name: "Accesorios", sortOrder: 1 },
  { slug: "comida", name: "Comida", sortOrder: 2 },
  { slug: "lentes", name: "Lentes", sortOrder: 3 },
  { slug: "otros", name: "Otros", sortOrder: 4 },
];

/** Primera vez que arranca con la BD vacía: carga las 4 categorías y el catálogo traído de Odoo. */
export async function seedIfEmpty() {
  if ((await db.select({ id: categories.id }).from(categories).limit(1)).length) return;

  const file = path.resolve(process.cwd(), "seed/catalog.json");
  const catalog = JSON.parse(fs.readFileSync(file, "utf8")) as { source: string; products: SeedProduct[] };
  const localPhotos = fs.existsSync(SEED_PHOTOS_DIR) ? fs.readdirSync(SEED_PHOTOS_DIR) : [];

  await db.transaction(async (tx) => {
    await tx.insert(categories).values(CATEGORIES);
    // Odoo no publica existencias: todo entra con 1 pieza y el aviso de "últimas piezas" apagado
    // hasta que se haga el conteo real (Ajustes → stock bajo).
    await tx.insert(settings).values({ key: "lowStock", value: "0" });
    const cats = await tx.select().from(categories);
    const catId = (slug: string) => cats.find((c) => c.slug === slug)!.id;

    // Del más antiguo al más nuevo, para que "recién llegados" respete el orden original.
    const sorted = [...catalog.products].sort((a, b) => a.odooId - b.odooId);
    const t0 = Date.now() - sorted.length * 60_000;
    for (const [i, p] of sorted.entries()) {
      const [res] = await tx.insert(products).values({
        slug: p.slug,
        name: p.name,
        price: p.price.toFixed(2),
        categoryId: catId(p.category),
        tags: p.tags.join(","),
        options: p.options,
        stock: 1,
        odooId: p.odooId,
        createdAt: new Date(t0 + i * 60_000),
      });
      const local = localPhotos.find((f) => f.startsWith(`${p.odooId}.`));
      const remote = (size: string) => `${catalog.source}/web/image/product.product/${p.odooId}/${size}?unique=${p.imageHash}`;
      await tx.insert(productImages).values({
        productId: res.insertId,
        url: local ? `/seed-fotos/${local}` : remote("image_1920"),
        thumbUrl: local ? `/seed-fotos/${local}` : remote("image_512"),
      });
    }
  });
  console.log(`[seed] catálogo inicial cargado: ${catalog.products.length} productos`);
}
