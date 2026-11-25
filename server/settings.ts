import { db } from "./db";
import { settings } from "./schema";
import { DEFAULT_SETTINGS, type StoreSettings } from "../shared/text";

export async function getSettings(): Promise<StoreSettings> {
  const rows = await db.select().from(settings);
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    if (!(r.key in DEFAULT_SETTINGS)) continue;
    try {
      out[r.key] = JSON.parse(r.value);
    } catch {
      /* valor dañado: se queda el predeterminado */
    }
  }
  return out as StoreSettings;
}

export async function saveSettings(patch: Partial<StoreSettings>) {
  for (const [key, value] of Object.entries(patch)) {
    const json = JSON.stringify(value);
    await db.insert(settings).values({ key, value: json }).onDuplicateKeyUpdate({ set: { value: json } });
  }
}
