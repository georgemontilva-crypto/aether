import sharp from "sharp";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { isNull, eq } from "drizzle-orm";
import { db } from "./db";
import { productImages } from "./schema";
import { putObject, removeObject, storageMode } from "./storage";

export type StoredImage = { url: string; thumbUrl: string; storageKey: string };

/** Optimiza una foto (WebP, máx. 1600 px + miniatura de 640 px) y la guarda en el almacenamiento. */
export async function processAndStore(input: Buffer): Promise<StoredImage> {
  const base = sharp(input, { failOn: "none" }).rotate();
  const [full, thumb] = await Promise.all([
    base.clone().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer(),
    base.clone().resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true }).webp({ quality: 74 }).toBuffer(),
  ]);
  const id = crypto.randomBytes(9).toString("base64url");
  const storageKey = `productos/${id}.webp`;
  const [url, thumbUrl] = await Promise.all([
    putObject(storageKey, full, "image/webp"),
    putObject(thumbKey(storageKey), thumb, "image/webp"),
  ]);
  return { url, thumbUrl, storageKey };
}

export const thumbKey = (key: string) => key.replace(/\.webp$/, "_t.webp");

export async function removeStored(storageKey: string | null) {
  if (!storageKey) return;
  await Promise.all([removeObject(storageKey), removeObject(thumbKey(storageKey))]);
}

/* ── Migración de fotos externas (Odoo / seed) al almacenamiento propio ───────── */

export const SOURCE_HOST = "aether-store.odoo.com";
export const SEED_PHOTOS_DIR = path.resolve(process.cwd(), "seed/fotos");

export const migration = { running: false, total: 0, done: 0, failed: 0, lastError: "" };

async function readSource(url: string): Promise<Buffer> {
  if (url.startsWith("/seed-fotos/")) {
    return fs.readFile(path.join(SEED_PHOTOS_DIR, path.basename(url)));
  }
  const u = new URL(url);
  // Solo se descargan fotos del catálogo original: nunca URLs arbitrarias.
  if (u.protocol !== "https:" || u.hostname !== SOURCE_HOST) throw new Error(`origen no permitido: ${u.hostname}`);
  const res = await fetch(u, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} al bajar ${u.pathname}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Traduce los errores típicos de R2 a qué variable revisar. */
function explain(err: unknown): string {
  const e = err as { name?: string; message?: string };
  const msg = e?.message ?? String(err);
  if (/EPROTO|handshake|ENOTFOUND/i.test(msg)) return "R2 no reconoce la cuenta: revisa R2_ACCOUNT_ID (son los 32 caracteres del endpoint, antes de .r2.cloudflarestorage.com).";
  if (/InvalidAccessKeyId|SignatureDoesNotMatch|Unauthorized|credential/i.test(`${e?.name} ${msg}`)) return "R2 rechazó las claves: revisa R2_ACCESS_KEY_ID y R2_SECRET_ACCESS_KEY.";
  if (/AccessDenied/i.test(`${e?.name} ${msg}`)) return "El token de R2 no tiene permiso de escritura sobre ese bucket (debe ser Object Read & Write).";
  if (/NoSuchBucket/i.test(`${e?.name} ${msg}`)) return "Ese bucket no existe en la cuenta: revisa R2_BUCKET.";
  return msg;
}

export async function pendingExternalCount(): Promise<number> {
  const rows = await db.select({ id: productImages.id }).from(productImages).where(isNull(productImages.storageKey));
  return rows.length;
}

/** Copia a R2 todas las fotos que todavía viven fuera. Se puede relanzar: solo toma las pendientes. */
export async function migrateExternalImages(): Promise<void> {
  if (migration.running || storageMode() === "none") return;
  const pending = await db.select().from(productImages).where(isNull(productImages.storageKey));
  if (!pending.length) return;
  Object.assign(migration, { running: true, total: pending.length, done: 0, failed: 0, lastError: "" });
  console.log(`[fotos] migrando ${pending.length} fotos al almacenamiento propio…`);
  const queue = [...pending];
  const worker = async () => {
    for (let img = queue.shift(); img; img = queue.shift()) {
      try {
        const stored = await processAndStore(await readSource(img.url));
        await db.update(productImages).set(stored).where(eq(productImages.id, img.id));
        migration.done++;
      } catch (err) {
        migration.failed++;
        migration.lastError = explain(err);
      }
    }
  };
  try {
    await Promise.all([worker(), worker(), worker()]);
  } finally {
    migration.running = false;
    console.log(`[fotos] listo: ${migration.done} migradas, ${migration.failed} con error ${migration.lastError}`);
  }
}
