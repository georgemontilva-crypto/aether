import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { money, normalize } from "@shared/text";
import { errorText, trpc, type AdminData } from "@/lib/trpc";
import { ProductImage } from "@/components/ProductCard";
import { IconPlus, IconSearch, IconX } from "@/components/ui";

type Row = AdminData["products"][number];
type Filter = "todos" | "agotados" | "bajo" | "ocultos";

/** Stock editable en la misma fila: se guarda solo, medio segundo después del último toque. */
function StockCell({ p }: { p: Row }) {
  const utils = trpc.useUtils();
  const [value, setValue] = useState(p.stock);
  const [state, setState] = useState<"" | "saving" | "saved" | "error">("");
  const save = trpc.admin.setStock.useMutation();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dirty = useRef(false);

  useEffect(() => {
    if (!dirty.current) setValue(p.stock);
  }, [p.stock]);

  const change = (n: number) => {
    const next = Math.max(0, Math.min(100000, Math.round(n) || 0));
    setValue(next);
    dirty.current = true;
    setState("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        await save.mutateAsync({ id: p.id, stock: next });
        dirty.current = false;
        setState("saved");
        void utils.admin.data.invalidate();
        void utils.shop.catalog.invalidate();
        setTimeout(() => setState((s) => (s === "saved" ? "" : s)), 1500);
      } catch {
        setState("error");
      }
    }, 550);
  };

  const tone = state === "error" ? "border-danger" : state === "saved" ? "border-ok" : state === "saving" ? "border-violet" : "border-line";
  return (
    <div className="flex shrink-0 flex-col items-end">
      <div className={`flex items-center overflow-hidden rounded-(--radius-ctl) border transition-colors ${tone}`}>
        <button className="grid h-11 w-11 place-items-center text-xl active:bg-raised disabled:opacity-30" onClick={() => change(value - 1)} disabled={value <= 0} aria-label={`Restar una pieza de ${p.name}`}>−</button>
        <input
          className={`h-11 w-12 border-x border-line bg-transparent text-center font-mono text-base tabular-nums focus:bg-raised focus:outline-none ${value === 0 ? "text-danger" : ""}`}
          inputMode="numeric"
          pattern="[0-9]*"
          enterKeyHint="done"
          value={value}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          onChange={(e) => change(Number(e.target.value.replace(/\D/g, "")))}
          aria-label={`Piezas en existencia de ${p.name}`}
        />
        <button className="grid h-11 w-11 place-items-center text-xl active:bg-raised" onClick={() => change(value + 1)} aria-label={`Sumar una pieza de ${p.name}`}>+</button>
      </div>
      <span className="sr-only" aria-live="polite">{state === "saved" ? "guardado" : state === "error" ? "no se guardó" : ""}</span>
      {state === "error" && <span className="mt-1 font-mono text-[10px] uppercase tracking-widest text-danger">no se guardó</span>}
    </div>
  );
}

function PhotosBanner({ storage }: { storage: AdminData["storage"] }) {
  const utils = trpc.useUtils();
  const migrate = trpc.admin.migratePhotos.useMutation({ onSuccess: () => utils.admin.data.invalidate() });
  const { mode, externalPhotos, migration } = storage;
  if (!externalPhotos && mode !== "none") return null;
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-(--radius-card) border border-violet/60 bg-violet/10 p-3 pl-4 text-sm md:p-4 md:pl-5">
      {mode === "none" ? (
        <p><strong>Falta conectar el almacenamiento de fotos (R2).</strong> El catálogo se ve porque las fotos aún se cargan desde Odoo, pero no podrás subir fotos nuevas hasta poner las variables <code className="font-mono">R2_*</code> en Railway.</p>
      ) : migration.running ? (
        <p>Copiando fotos al almacenamiento propio… <strong className="font-mono">{migration.done}/{migration.total}</strong></p>
      ) : (
        <>
          <p className="min-w-0 flex-1"><strong>{externalPhotos} fotos aún se cargan desde Odoo.</strong>{migration.failed > 0 && <span className="block text-danger">Fallaron {migration.failed}: {migration.lastError}</span>}</p>
          <button className="btn btn-sm" onClick={() => migrate.mutate()} disabled={migrate.isPending}>Copiar ahora</button>
        </>
      )}
      {migrate.error && <p className="w-full text-danger">{errorText(migrate.error)}</p>}
    </div>
  );
}

export default function Inventory({ data }: { data: AdminData }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [cat, setCat] = useState(0);
  const low = data.settings.lowStock;
  const cats = new Map(data.categories.map((c) => [c.id, c.name]));

  const stats = useMemo(() => {
    const active = data.products.filter((p) => p.active);
    return {
      pieces: data.products.reduce((a, p) => a + p.stock, 0),
      value: data.products.reduce((a, p) => a + p.stock * p.price, 0),
      active: active.length,
      out: data.products.filter((p) => p.stock === 0).length,
      low: data.products.filter((p) => p.stock > 0 && p.stock <= low).length,
      hidden: data.products.length - active.length,
    };
  }, [data.products, low]);

  const rows = useMemo(() => {
    const needle = normalize(q);
    return data.products.filter((p) => {
      if (cat && p.categoryId !== cat) return false;
      if (filter === "agotados" && p.stock !== 0) return false;
      if (filter === "bajo" && !(p.stock > 0 && p.stock <= low)) return false;
      if (filter === "ocultos" && p.active) return false;
      return !needle || normalize(`${p.name} ${p.tags.join(" ")}`).includes(needle);
    });
  }, [data.products, q, filter, cat, low]);

  // Las cifras de arriba también son filtros: tocar "Agotados" muestra los agotados.
  const tiles: { label: string; value: string; tone?: string; filter?: Filter }[] = [
    { label: "Piezas", value: String(stats.pieces), tone: "text-violet", filter: "todos" },
    { label: "Agotados", value: String(stats.out), tone: stats.out ? "text-danger" : "", filter: "agotados" },
    { label: "Stock bajo", value: String(stats.low), filter: "bajo" },
    { label: "Ocultos", value: String(stats.hidden), filter: "ocultos" },
    { label: "Valor", value: money(stats.value) },
  ];

  return (
    <>
      <PhotosBanner storage={data.storage} />

      <div className="scroll-x -mx-[clamp(16px,4vw,56px)] !gap-2 px-[clamp(16px,4vw,56px)] md:mx-0 md:grid md:grid-cols-5 md:!gap-px md:overflow-hidden md:rounded-(--radius-card) md:border md:border-line md:bg-line md:px-0">
        {tiles.map((t) => {
          const on = !!t.filter && filter === t.filter && t.filter !== "todos";
          return (
            <button
              key={t.label}
              disabled={!t.filter}
              onClick={() => t.filter && setFilter(on ? "todos" : t.filter)}
              aria-pressed={t.filter ? on : undefined}
              className={`min-w-[104px] shrink-0 rounded-(--radius-ctl) border p-3 text-left md:min-w-0 md:rounded-none md:border-0 md:bg-bg md:p-4 ${on ? "border-violet bg-violet/10 md:!bg-violet/10" : "border-line"} ${t.filter ? "active:bg-raised" : "!cursor-default"}`}
            >
              <span className="label block">{t.label}</span>
              <span className={`mt-0.5 block font-mono text-2xl tabular-nums md:text-3xl ${t.tone ?? ""}`}>{t.value}</span>
            </button>
          );
        })}
      </div>

      <div className="admin-sticky sticky z-30 -mx-[clamp(16px,4vw,56px)] mt-3 border-b border-line bg-bg/95 px-[clamp(16px,4vw,56px)] py-2.5 backdrop-blur-md md:mt-5">
        <div className="flex gap-2">
          <label className="relative flex-1">
            <span className="sr-only">Buscar en el inventario</span>
            <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" width={18} height={18} />
            <input className="field !pl-11 !pr-11" type="search" enterKeyHint="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto o hashtag…" />
            {q && (
              <button className="absolute right-0.5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center text-muted" onClick={() => setQ("")} aria-label="Borrar búsqueda">
                <IconX width={16} height={16} />
              </button>
            )}
          </label>
          <Link href="/admin/producto/nuevo" className="btn btn-violet hidden md:inline-flex"><IconPlus width={16} height={16} /> Nuevo producto</Link>
        </div>
        <div className="scroll-x -mx-[clamp(16px,4vw,56px)] mt-2 px-[clamp(16px,4vw,56px)]">
          <button className="chip" aria-pressed={!cat} onClick={() => setCat(0)}>Todas</button>
          {data.categories.map((c) => (
            <button key={c.id} className="chip" aria-pressed={cat === c.id} onClick={() => setCat(cat === c.id ? 0 : c.id)}>{c.name}</button>
          ))}
        </div>
      </div>

      <p className="label mt-3 flex items-center justify-between">
        <span>{rows.length} {rows.length === 1 ? "producto" : "productos"}{filter !== "todos" && ` · ${{ agotados: "agotados", bajo: "stock bajo", ocultos: "ocultos" }[filter]}`}</span>
        {(filter !== "todos" || cat !== 0 || q) && <button className="underline underline-offset-4" onClick={() => (setFilter("todos"), setCat(0), setQ(""))}>Quitar filtros</button>}
      </p>

      <ul className="mt-2 divide-y divide-line border-y border-line">
        {rows.map((p) => (
          <li key={p.id} className="flex items-center gap-3 py-2.5">
            <Link href={`/admin/producto/${p.id}`} className={`flex min-w-0 flex-1 items-center gap-3 active:opacity-60 ${p.active ? "" : "opacity-50"}`} aria-label={`Editar ${p.name}`}>
              <ProductImage src={p.images[0]?.thumbUrl} alt="" className="h-[60px] w-[50px] shrink-0 rounded-[10px] border border-line object-cover" />
              <span className="min-w-0">
                <span className="line-clamp-2 break-words font-mono text-[13px] leading-snug">{p.name}</span>
                <span className="mt-0.5 block truncate text-xs text-muted">
                  {money(p.price)} · {cats.get(p.categoryId) ?? "Sin categoría"}
                  {!p.active && " · oculto"}
                  {p.stock > 0 && p.stock <= low && <span className="text-violet"> · stock bajo</span>}
                </span>
              </span>
            </Link>
            <StockCell p={p} />
          </li>
        ))}
        {!rows.length && <li className="py-14 text-center text-muted">Ningún producto coincide con ese filtro.</li>}
      </ul>

      {data.movements.length > 0 && (
        <details className="mt-8 overflow-hidden rounded-(--radius-card) border border-line">
          <summary className="label flex min-h-12 items-center px-4 !text-ink">Últimos movimientos de inventario</summary>
          <ul className="divide-y divide-line border-t border-line">
            {data.movements.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0 truncate"><span className="font-mono">{m.name}</span> <span className="text-muted">· {m.reason}</span></span>
                <span className="shrink-0 font-mono tabular-nums"><span className={m.delta > 0 ? "text-ok" : "text-danger"}>{m.delta > 0 ? "+" : ""}{m.delta}</span> <span className="text-muted">→ {m.stockAfter}</span></span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
