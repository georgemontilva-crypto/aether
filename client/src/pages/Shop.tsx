import { useEffect, useMemo, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { useCatalog } from "@/lib/catalog";
import { ProductGrid } from "@/components/ProductCard";
import { IconSearch, IconX, useReveal } from "@/components/ui";

const SORTS = { nuevo: "Lo más nuevo", menor: "Precio: menor a mayor", mayor: "Precio: mayor a menor", az: "Nombre A–Z" } as const;
type Sort = keyof typeof SORTS;

export default function Shop() {
  const { catalog, tags, search, isLoading } = useCatalog();
  const [, navigate] = useLocation();
  const params = new URLSearchParams(useSearch());
  const ref = useReveal<HTMLDivElement>();
  const input = useRef<HTMLInputElement>(null);

  const q = params.get("q") ?? "";
  const cat = params.get("cat") ?? "";
  const tag = params.get("tag") ?? "";
  const sort = (params.get("orden") as Sort) in SORTS ? (params.get("orden") as Sort) : "nuevo";

  // Los filtros viven en la URL: se pueden compartir y el botón "atrás" funciona.
  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    next.delete("buscar");
    for (const [k, v] of Object.entries(patch)) v ? next.set(k, v) : next.delete(k);
    const s = next.toString();
    navigate(s ? `/tienda?${s}` : "/tienda", { replace: true });
  };

  // "Buscar" (barra inferior o lupa) trae hasta aquí con el teclado ya abierto.
  const wantsSearch = params.get("buscar");
  useEffect(() => {
    if (wantsSearch) input.current?.focus();
  }, [wantsSearch]);

  const category = catalog?.categories.find((c) => c.slug === cat);
  const results = useMemo(() => {
    const match = search(q);
    const list = (catalog?.products ?? []).filter((p) => (!category || p.categoryId === category.id) && (!tag || p.tags.includes(tag)) && match(p));
    const by: Record<Sort, (a: (typeof list)[number], b: (typeof list)[number]) => number> = {
      nuevo: (a, b) => b.createdAt - a.createdAt,
      menor: (a, b) => a.price - b.price,
      mayor: (a, b) => b.price - a.price,
      az: (a, b) => a.name.localeCompare(b.name, "es"),
    };
    // Lo agotado siempre al final: primero lo que sí se puede comprar.
    return list.sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || by[sort](a, b));
  }, [catalog, q, category, tag, sort]);

  // Hashtags de la sección elegida (o de toda la tienda), del más usado al menos.
  const visibleTags = useMemo(() => {
    if (!category) return tags.slice(0, 18);
    const count = new Map<string, number>();
    for (const p of catalog?.products ?? []) if (p.categoryId === category.id) for (const t of p.tags) count.set(t, (count.get(t) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([t, c]) => ({ tag: t, count: c })).slice(0, 18);
  }, [catalog, category, tags]);

  const filtering = !!(q || cat || tag);
  const sortSelect = (className: string) => (
    <select className={className} value={sort} onChange={(e) => set({ orden: e.target.value === "nuevo" ? "" : e.target.value })} aria-label="Ordenar">
      {Object.entries(SORTS).map(([k, v]) => (
        <option key={k} value={k}>{v}</option>
      ))}
    </select>
  );

  return (
    <div ref={ref} className="wrap pt-7 md:pt-10">
      <div className="flex items-end justify-between gap-4">
        <h1 className="display text-[clamp(3rem,9vw,7rem)]">{category?.name ?? "Tienda"}</h1>
        <div className="flex flex-col items-end gap-1 pb-2 md:pb-3">
          <span className="label tabular-nums">{String(results.length).padStart(2, "0")} piezas</span>
          {sortSelect("md:hidden !min-h-9 !w-auto !border-0 !bg-transparent !p-0 !pr-1 text-right font-mono !text-[11px] uppercase tracking-[0.1em] text-muted")}
        </div>
      </div>

      <div className="glass shop-sticky sticky z-30 -mx-[clamp(16px,4vw,56px)] mt-5 !border-x-0 px-[clamp(16px,4vw,56px)] py-3 !shadow-none">
        <div className="flex gap-2">
          <label className="relative flex-1">
            <span className="sr-only">Buscar productos</span>
            <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" width={18} height={18} />
            <input ref={input} className="field !pl-11 !pr-11" type="search" enterKeyHint="search" value={q} onChange={(e) => set({ q: e.target.value })} placeholder="Busca: collar, anillo, peluca, lentes…" />
            {q && (
              <button className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center text-muted hover:text-ink" onClick={() => set({ q: "" })} aria-label="Borrar búsqueda">
                <IconX width={16} height={16} />
              </button>
            )}
          </label>
          {sortSelect("field hidden !w-auto font-mono !text-xs md:block")}
        </div>
        <div className="scroll-x mt-2.5">
          <button className="chip" aria-pressed={!cat} onClick={() => set({ cat: "", tag: "" })}>
            Todo
          </button>
          {catalog?.categories.map((c) => (
            <button key={c.id} className="chip" aria-pressed={cat === c.slug} onClick={() => set({ cat: cat === c.slug ? "" : c.slug, tag: "" })}>
              {c.name}
            </button>
          ))}
          <span className="mx-1 w-px shrink-0 self-stretch bg-line" />
          {visibleTags.map((t) => (
            <button key={t.tag} className="chip" aria-pressed={tag === t.tag} onClick={() => set({ tag: tag === t.tag ? "" : t.tag })}>
              #{t.tag}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-8">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="aspect-[4/5] animate-pulse rounded-(--radius-card) border border-line bg-surface" />
            ))}
          </div>
        ) : results.length ? (
          <ProductGrid products={results} />
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-(--radius-panel) border border-line px-6 py-20 text-center">
            <p className="display text-4xl">Nada por aquí.</p>
            <p className="max-w-sm text-muted">No encontramos piezas con esa búsqueda. Prueba con otra palabra o pídela por encargo.</p>
            {filtering && (
              <button className="btn" onClick={() => navigate("/tienda", { replace: true })}>
                Ver todo el catálogo
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
