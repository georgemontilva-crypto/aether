import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { money, normalize } from "@shared/text";
import { errorText, trpc, type AdminData } from "@/lib/trpc";
import { ProductImage } from "@/components/ProductCard";
import { IconPlus, IconSearch } from "@/components/ui";

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

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center border border-line">
        <button className="grid h-10 w-10 place-items-center text-lg hover:bg-raised disabled:opacity-30" onClick={() => change(value - 1)} disabled={value <= 0} aria-label={`Restar una pieza de ${p.name}`}>−</button>
        <input
          className="h-10 w-14 border-x border-line bg-transparent text-center font-mono text-base tabular-nums focus:bg-raised focus:outline-none"
          inputMode="numeric"
          value={value}
          onFocus={(e) => e.target.select()}
          onChange={(e) => change(Number(e.target.value.replace(/\D/g, "")))}
          aria-label={`Piezas en existencia de ${p.name}`}
        />
        <button className="grid h-10 w-10 place-items-center text-lg hover:bg-raised" onClick={() => change(value + 1)} aria-label={`Sumar una pieza de ${p.name}`}>+</button>
      </div>
      <span className={`h-3 font-mono text-[10px] uppercase tracking-widest ${state === "error" ? "text-danger" : state === "saved" ? "text-ok" : "text-muted"}`} aria-live="polite">
        {state === "saving" ? "guardando…" : state === "saved" ? "guardado ✓" : state === "error" ? "no se guardó" : ""}
      </span>
    </div>
  );
}

function PhotosBanner({ storage }: { storage: AdminData["storage"] }) {
  const utils = trpc.useUtils();
  const migrate = trpc.admin.migratePhotos.useMutation({ onSuccess: () => utils.admin.data.invalidate() });
  const { mode, externalPhotos, migration } = storage;
  if (!externalPhotos && mode !== "none") return null;
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border border-violet/60 bg-violet/10 p-4 text-sm">
      {mode === "none" ? (
        <p><strong>Falta conectar el almacenamiento de fotos (R2).</strong> El catálogo se ve porque las fotos todavía se cargan desde la tienda de Odoo, pero no podrás subir fotos nuevas hasta poner las variables <code className="font-mono">R2_*</code> en Railway.</p>
      ) : migration.running ? (
        <p>Copiando fotos al almacenamiento propio… <strong className="font-mono">{migration.done}/{migration.total}</strong></p>
      ) : (
        <>
          <p><strong>{externalPhotos} fotos todavía se cargan desde Odoo.</strong> Cópialas a tu almacenamiento para no depender de la tienda vieja.{migration.failed > 0 && <span className="text-danger"> La última vez fallaron {migration.failed}: {migration.lastError}</span>}</p>
          <button className="btn btn-sm" onClick={() => migrate.mutate()} disabled={migrate.isPending}>Copiar fotos ahora</button>
        </>
      )}
      {migrate.error && <p className="w-full text-danger">{errorText(migrate.error)}</p>}
    </div>
  );
}

export default function Inventory({ data }: { data: AdminData }) {
  const utils = trpc.useUtils();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [cat, setCat] = useState(0);
  const setActive = trpc.admin.setActive.useMutation({ onSuccess: () => (utils.admin.data.invalidate(), utils.shop.catalog.invalidate()) });
  const low = data.settings.lowStock;
  const cats = new Map(data.categories.map((c) => [c.id, c.name]));

  const stats = useMemo(() => {
    const active = data.products.filter((p) => p.active);
    return {
      pieces: data.products.reduce((a, p) => a + p.stock, 0),
      value: data.products.reduce((a, p) => a + p.stock * p.price, 0),
      active: active.length,
      out: active.filter((p) => p.stock === 0).length,
      low: active.filter((p) => p.stock > 0 && p.stock <= low).length,
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

  const filters: [Filter, string, number][] = [
    ["todos", "Todos", data.products.length],
    ["agotados", "Agotados", data.products.filter((p) => p.stock === 0).length],
    ["bajo", "Stock bajo", data.products.filter((p) => p.stock > 0 && p.stock <= low).length],
    ["ocultos", "Ocultos", data.products.filter((p) => !p.active).length],
  ];

  return (
    <>
      <PhotosBanner storage={data.storage} />

      <div className="grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-5">
        {[
          ["Piezas en existencia", String(stats.pieces), "text-violet"],
          ["Productos visibles", String(stats.active), ""],
          ["Agotados", String(stats.out), stats.out ? "text-danger" : ""],
          ["Stock bajo", String(stats.low), ""],
          ["Valor del inventario", money(stats.value), ""],
        ].map(([label, value, tone], i) => (
          <div key={label} className={`bg-bg p-4 ${i === 4 ? "col-span-2 md:col-span-1" : ""}`}>
            <p className="label">{label}</p>
            <p className={`mt-1 font-mono text-3xl tabular-nums ${tone}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <label className="relative min-w-[200px] flex-1">
          <span className="sr-only">Buscar en el inventario</span>
          <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" width={18} height={18} />
          <input className="field !pl-11" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto o hashtag…" />
        </label>
        <select className="field !w-auto" value={cat} onChange={(e) => setCat(Number(e.target.value))} aria-label="Categoría">
          <option value={0}>Todas las categorías</option>
          {data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <Link href="/admin/producto/nuevo" className="btn btn-violet hidden md:inline-flex"><IconPlus width={16} height={16} /> Nuevo producto</Link>
      </div>
      <div className="scroll-x mt-3">
        {filters.map(([key, label, n]) => (
          <button key={key} className="chip" aria-pressed={filter === key} onClick={() => setFilter(key)}>{label} <span className="opacity-70">{n}</span></button>
        ))}
      </div>

      <ul className="mt-4 divide-y divide-line border-y border-line">
        {rows.map((p) => (
          <li key={p.id} className={`flex items-center gap-3 py-3 sm:gap-4 ${p.active ? "" : "opacity-55"}`}>
            <Link href={`/admin/producto/${p.id}`} className="shrink-0" aria-label={`Editar ${p.name}`}>
              <ProductImage src={p.images[0]?.thumbUrl} alt="" className="h-16 w-14 border border-line object-cover" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/admin/producto/${p.id}`} className="block truncate font-mono text-sm hover:text-violet">{p.name}</Link>
              <p className="mt-0.5 truncate text-xs text-muted">
                {money(p.price)} · {cats.get(p.categoryId) ?? "Sin categoría"}
                {p.stock === 0 ? <span className="text-danger"> · agotado</span> : p.stock <= low ? <span className="text-violet"> · stock bajo</span> : null}
              </p>
              <div className="mt-1 flex items-center gap-3">
                <button className="font-mono text-[10px] uppercase tracking-widest text-muted underline-offset-4 hover:text-ink hover:underline" onClick={() => setActive.mutate({ id: p.id, active: !p.active })}>
                  {p.active ? "Visible · ocultar" : "Oculto · mostrar"}
                </button>
                <Link href={`/admin/producto/${p.id}`} className="font-mono text-[10px] uppercase tracking-widest text-muted underline-offset-4 hover:text-ink hover:underline">Editar</Link>
              </div>
            </div>
            <StockCell p={p} />
          </li>
        ))}
        {!rows.length && <li className="py-14 text-center text-muted">Ningún producto coincide con ese filtro.</li>}
      </ul>

      {data.movements.length > 0 && (
        <details className="mt-10 border border-line">
          <summary className="label p-4 !text-ink">Últimos movimientos de inventario</summary>
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

