const e = process.env;

/** Quita espacios y comillas que se cuelan al pegar valores en Railway. */
const clean = (v: string | undefined) => (v ?? "").trim().replace(/^["']|["']$/g, "");

/** Acepta el ID de cuenta solo o el endpoint completo de R2 y se queda con el ID. */
const accountId = (v: string | undefined) =>
  clean(v)
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/\.r2\.cloudflarestorage\.com$/i, "");

export const env = {
  isProd: e.NODE_ENV === "production",
  port: Number(e.PORT ?? 3000),
  databaseUrl: e.DATABASE_URL ?? e.MYSQL_URL ?? "",
  adminPassword: e.ADMIN_PASSWORD ?? "",
  jwtSecret: e.JWT_SECRET ?? "",
  publicUrl: (e.PUBLIC_URL ?? (e.RAILWAY_PUBLIC_DOMAIN ? `https://${e.RAILWAY_PUBLIC_DOMAIN}` : "")).replace(/\/$/, ""),
  uploadDir: e.UPLOAD_DIR ?? "",
  r2: {
    accountId: accountId(e.R2_ACCOUNT_ID),
    accessKeyId: clean(e.R2_ACCESS_KEY_ID),
    secretAccessKey: clean(e.R2_SECRET_ACCESS_KEY),
    bucket: clean(e.R2_BUCKET),
    publicUrl: clean(e.R2_PUBLIC_URL).replace(/\/$/, ""),
  },
};

export function assertEnv() {
  const missing: string[] = [];
  if (!env.databaseUrl) missing.push("DATABASE_URL");
  if (!env.adminPassword) missing.push("ADMIN_PASSWORD");
  if (!env.jwtSecret) missing.push("JWT_SECRET");
  if (missing.length) {
    console.error(`\n[aether] Faltan variables de entorno: ${missing.join(", ")}\nRevisa .env.example\n`);
    process.exit(1);
  }
}
