import { createExpressMiddleware } from "@trpc/server/adapters/express";
import compression from "compression";
import express from "express";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { isAdmin } from "./auth";
import { db, runMigrations } from "./db";
import { assertEnv, env } from "./env";
import { migrateExternalImages, processAndStore, SEED_PHOTOS_DIR } from "./images";
import { appRouter } from "./router";
import { productImages, products } from "./schema";
import { seedIfEmpty } from "./seed";
import { localDir, storageMode } from "./storage";
import { createContext } from "./trpc";

assertEnv();
await runMigrations();
await seedIfEmpty();

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(compression());

app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));

/* Subida de fotos desde el panel: llegan, se optimizan a WebP y van al almacenamiento. */
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024, files: 12 } });
app.post("/api/admin/upload", async (req, res, next) => {
  if (!(await isAdmin(req))) return res.status(401).json({ error: "Inicia sesión en el panel" });
  if (storageMode() === "none") return res.status(503).json({ error: "Falta configurar el almacenamiento de fotos (variables R2_* en Railway)." });
  next();
}, upload.array("fotos", 12), async (req, res) => {
  try {
    const files = (req.files as Express.Multer.File[]) ?? [];
    if (!files.length) return res.status(400).json({ error: "No llegó ninguna foto" });
    const out = [];
    for (const f of files) out.push(await processAndStore(f.buffer));
    res.json({ images: out });
  } catch (err) {
    console.error("[upload]", err);
    res.status(400).json({ error: "No se pudo procesar la foto. Prueba con JPG, PNG o WebP." });
  }
});
app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError) return res.status(400).json({ error: err.code === "LIMIT_FILE_SIZE" ? "La foto pesa más de 15 MB" : "Demasiadas fotos a la vez (máx. 12)" });
  next(err);
});

const longCache = { maxAge: "365d", immutable: true };
app.use("/uploads", express.static(localDir, longCache));
if (fs.existsSync(SEED_PHOTOS_DIR)) app.use("/seed-fotos", express.static(SEED_PHOTOS_DIR, { maxAge: "30d" }));

/* ── Cliente ─────────────────────────────────────────────────────────────── */
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Para que al compartir un producto por WhatsApp salga su nombre, precio y foto. */
async function withMeta(html: string, url: string): Promise<string> {
  // El panel se puede instalar en el teléfono como app (y no debe salir en buscadores).
  if (url.startsWith("/admin")) {
    const tags = `<link rel="manifest" href="/admin.webmanifest"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="Aether Panel"><meta name="robots" content="noindex">`;
    return html.replace(/<title>.*?<\/title>/, "<title>Aether · Panel</title>").replace("</head>", `${tags}</head>`);
  }
  const m = url.match(/^\/producto\/([a-z0-9-]+)/);
  if (!m) return html;
  const [p] = await db.select().from(products).where(eq(products.slug, m[1])).limit(1);
  if (!p || !p.active) return html;
  const [img] = await db.select().from(productImages).where(eq(productImages.productId, p.id)).orderBy(productImages.sortOrder).limit(1);
  const title = esc(`${p.name} · $${Number(p.price).toFixed(2)} — AETHER`);
  const abs = (u: string) => (u.startsWith("http") ? u : `${env.publicUrl}${u}`);
  const tags = [`<meta property="og:title" content="${title}">`, `<meta property="og:type" content="product">`, img ? `<meta property="og:image" content="${esc(abs(img.url))}">` : ""].join("");
  return html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`).replace("</head>", `${tags}</head>`);
}

// Solo las rutas de página reciben el HTML de la app; un archivo que no existe responde 404.
const isPage = (req: express.Request) => req.method === "GET" && !req.path.startsWith("/api/") && !/\.[a-z0-9]{2,5}$/i.test(req.path);

if (env.isProd) {
  const dist = path.resolve(process.cwd(), "dist/public");
  const template = fs.readFileSync(path.join(dist, "index.html"), "utf8");
  app.use("/assets", express.static(path.join(dist, "assets"), longCache));
  app.use(express.static(dist, { index: false, maxAge: "1h" }));
  app.use(async (req, res, next) => {
    if (!isPage(req)) return next();
    res.set("Cache-Control", "no-cache").type("html").send(await withMeta(template, req.path).catch(() => template));
  });
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  app.use(vite.middlewares);
  app.use(async (req, res, next) => {
    if (!isPage(req)) return next();
    const raw = fs.readFileSync(path.resolve(process.cwd(), "client/index.html"), "utf8");
    res.type("html").send(await withMeta(await vite.transformIndexHtml(req.originalUrl, raw), req.path));
  });
}

app.listen(env.port, "0.0.0.0", () => {
  console.log(`[aether] tienda arriba en el puerto ${env.port} · fotos: ${storageMode()}`);
  // Con R2 listo, las fotos que siguen en Odoo se copian solas en segundo plano.
  if (storageMode() === "r2") void migrateExternalImages();
});
