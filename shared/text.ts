/** Normaliza texto para buscar: minúsculas, sin acentos, sin símbolos. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Palabras distintas para lo mismo: buscar "zarcillos" encuentra lo etiquetado #pendientes. */
const SYNONYMS = [
  ["pendiente", "zarcillo", "arete", "arito"],
  ["lentesdecontacto", "pupilente", "lentilla"],
  ["bolso", "cartera"],
  ["gorro", "gorra", "sombrero"],
  ["anillo", "sortija"],
  ["collar", "cadena", "gargantilla"],
  ["pulsera", "brazalete"],
  ["cabello", "pelo"],
  ["cinturon", "correa"],
];

/**
 * Formas con las que puede aparecer una palabra buscada: tal cual, sin plural
 * (collares → collar, anillos → anillo) y sus sinónimos.
 */
export function variants(token: string): string[] {
  const forms = new Set([token]);
  if (token.length > 3 && token.endsWith("s")) forms.add(token.slice(0, -1));
  if (token.length > 4 && token.endsWith("es")) forms.add(token.slice(0, -2));
  for (const group of SYNONYMS) if (group.some((w) => forms.has(w))) group.forEach((w) => forms.add(w));
  return [...forms];
}

/** Convierte lo que escriba el admin en un hashtag limpio: "#Collar Gótico" → "collargótico". */
export function cleanTag(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[#\s]+/g, "")
    .replace(/[^\p{L}\p{N}_-]/gu, "")
    .slice(0, 40);
}

export function slugify(s: string): string {
  return normalize(s).replace(/\s+/g, "-").slice(0, 80) || "producto";
}

export function parseList(csv: string | null | undefined): string[] {
  return (csv ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function money(n: number): string {
  return "$" + n.toFixed(2);
}

export const ORDER_STATUSES = ["pendiente", "confirmado", "cancelado"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type StoreSettings = {
  whatsapp: string;
  paymentMethods: string[];
  announcement: string;
  instagram: string;
  tiktok: string;
  facebook: string;
  email: string;
  lowStock: number;
};

export const DEFAULT_SETTINGS: StoreSettings = {
  whatsapp: "584246069516",
  paymentMethods: ["Pago móvil", "Zelle", "Binance", "Efectivo"],
  announcement: "Encargos cada mes · pide lo que quieras dentro y fuera del catálogo",
  instagram: "",
  tiktok: "",
  facebook: "",
  email: "aether.stxre@gmail.com",
  lowStock: 2,
};
