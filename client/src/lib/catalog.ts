import { useMemo } from "react";
import { normalize, variants } from "@shared/text";
import { trpc, type Product } from "./trpc";

export function useCatalog() {
  const q = trpc.shop.catalog.useQuery();
  const index = useMemo(() => {
    const cats = new Map((q.data?.categories ?? []).map((c) => [c.id, c]));
    // Texto de búsqueda por producto: nombre + hashtags + categoría, sin acentos.
    const haystack = new Map<number, string>();
    for (const p of q.data?.products ?? []) {
      haystack.set(p.id, normalize([p.name, ...p.tags, cats.get(p.categoryId)?.name ?? ""].join(" ")) + " " + p.tags.map((t) => normalize(t).replace(/ /g, "")).join(" "));
    }
    const tagCount = new Map<string, number>();
    for (const p of q.data?.products ?? []) for (const t of p.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
    const tags = [...tagCount.entries()].sort((a, b) => b[1] - a[1]).map(([tag, count]) => ({ tag, count }));
    return { cats, haystack, tags };
  }, [q.data]);

  const search = (text: string): ((p: Product) => boolean) => {
    const tokens = normalize(text).split(" ").filter(Boolean).map(variants);
    if (!tokens.length) return () => true;
    return (p) => {
      const h = index.haystack.get(p.id) ?? "";
      return tokens.every((forms) => forms.some((f) => h.includes(f)));
    };
  };

  return { ...q, catalog: q.data, ...index, search };
}

export const inStock = (p: Product) => p.stock > 0;
