import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import fs from "node:fs/promises";
import path from "node:path";
import { env } from "./env";

export type StorageMode = "r2" | "local" | "none";

/**
 * r2    → Cloudflare R2 (producción).
 * local → carpeta en disco (solo desarrollo, o producción con un volumen en UPLOAD_DIR).
 * none  → producción sin R2: no se pueden subir fotos (el disco de Railway se borra en cada deploy).
 */
export function storageMode(): StorageMode {
  const r = env.r2;
  if (r.accountId && r.accessKeyId && r.secretAccessKey && r.bucket && r.publicUrl) return "r2";
  if (env.uploadDir || !env.isProd) return "local";
  return "none";
}

export const localDir = path.resolve(env.uploadDir || "uploads");

let client: S3Client | null = null;
function s3() {
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${env.r2.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.r2.accessKeyId, secretAccessKey: env.r2.secretAccessKey },
    // R2 no acepta las sumas de verificación que el SDK nuevo agrega por defecto.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return client;
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<string> {
  const mode = storageMode();
  if (mode === "r2") {
    await s3().send(
      new PutObjectCommand({
        Bucket: env.r2.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return `${env.r2.publicUrl}/${key}`;
  }
  if (mode === "local") {
    const file = path.join(localDir, key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, body);
    return `/uploads/${key}`;
  }
  throw new Error("No hay almacenamiento de fotos configurado (faltan las variables R2_*).");
}

export async function removeObject(key: string): Promise<void> {
  try {
    const mode = storageMode();
    if (mode === "r2") await s3().send(new DeleteObjectCommand({ Bucket: env.r2.bucket, Key: key }));
    else if (mode === "local") await fs.rm(path.join(localDir, key), { force: true });
  } catch (err) {
    console.warn("[storage] no se pudo borrar", key, err);
  }
}
