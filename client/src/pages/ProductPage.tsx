import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { money } from "@shared/text";
import { useCatalog } from "@/lib/catalog";
import { cart, useCart } from "@/lib/store";
import { ProductGrid, ProductImage, StockBadge } from "@/components/ProductCard";
import { IconArrow, IconCheck, Stepper, useReveal } from "@/components/ui";
import NotFound from "./NotFound";

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { catalog, cats, isLoading } = useCatalog();
  const { lines } = useCart();
  const ref = useReveal<HTMLDivElement>();
  const p = catalog?.products.find((x) => x.slug === slug);
  const [shot, setShot] = useState(0);
  const [option, setOption] = useState("");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [needOption, setNeedOption] = useState(false);

  useEffect(() => {
    setShot(0);
    setOption("");
    setQty(1);
    setAdded(false);
    window.scrollTo(0, 0);
    if (p) document.title = `${p.name} — AETHER`;
    return () => void (document.title = "AETHER — accesorios para verse facheros");
  }, [slug, p?.id]);

  if (isLoading) return <div className="wrap grid min-h-[60vh] place-items-center"><span className="label animate-pulse">Cargando…</span></div>;
  if (!p) return <NotFound />;

  const category = cats.get(p.categoryId);
  const inCart = lines.filter((l) => l.productId === p.id).reduce((a, l) => a + l.qty, 0);
  const left = Math.max(0, p.stock - inCart);
  const sold = p.stock <= 0;
  const related = catalog!.products
    .filter((x) => x.id !== p.id && x.stock > 0)
    .map((x) => ({ x, score: x.tags.filter((t) => p.tags.includes(t)).length * 2 + Number(x.categoryId === p.categoryId) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((r) => r.x);

  const add = () => {
    if (p.options.length && !option) return setNeedOption(true);
    if (cart.add(p.id, option, Math.min(qty, left), p.stock)) {
      setAdded(true);
      setQty(1);
      setTimeout(() => setAdded(false), 1600);
    }
  };

  return (
    <div ref={ref} className="wrap pt-6">
      <nav className="label flex flex-wrap items-center gap-2" aria-label="Ruta">
        <Link href="/tienda" className="hover:text-ink">Tienda</Link>
        <span>/</span>
        {category && <Link href={`/tienda?cat=${category.slug}`} className="hover:text-ink">{category.name}</Link>}
      </nav>

      <div className="mt-5 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <div className="rise">
          <div className="relative overflow-hidden border border-line">
            <ProductImage key={p.images[shot]?.url} src={p.images[shot]?.url} alt={p.name} eager className={`aspect-[4/5] w-full object-cover ${sold ? "opacity-50 grayscale" : ""}`} />
            <div className="absolute left-0 top-0"><StockBadge p={p} low={catalog!.settings.lowStock} /></div>
          </div>
          {p.images.length > 1 && (
            <div className="scroll-x mt-3">
              {p.images.map((img, i) => (
                <button key={img.id} onClick={() => setShot(i)} className={`h-20 w-16 shrink-0 border ${i === shot ? "border-violet" : "border-line opacity-60 hover:opacity-100"}`} aria-label={`Foto ${i + 1}`} aria-pressed={i === shot}>
                  <ProductImage src={img.thumbUrl} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rise lg:sticky lg:top-28 lg:self-start" style={{ ["--i" as string]: 1 }}>
          <h1 className="break-words font-mono text-[clamp(1.7rem,4.4vw,2.9rem)] leading-[1.08] tracking-tight">{p.name}</h1>
          <p className="mt-4 font-mono text-3xl tabular-nums text-violet">{money(p.price)}</p>

          <p className="mt-5 flex items-center gap-2 text-sm">
            <span className={`h-2 w-2 ${sold ? "bg-danger" : "bg-ok shadow-[0_0_10px_var(--ok)]"}`} />
            {sold ? "Agotado por ahora" : p.stock > catalog!.settings.lowStock ? "Disponible" : p.stock === 1 ? "Última pieza" : `Últimas ${p.stock} piezas`}
          </p>

          {p.options.length > 0 && (
            <div className="mt-7">
              <p className={`label mb-2.5 ${needOption && !option ? "!text-danger" : ""}`}>{needOption && !option ? "Elige una opción" : "Opción"}</p>
              <div className="flex flex-wrap gap-2">
                {p.options.map((o) => (
                  <button key={o} className="chip !min-h-11 !min-w-11 justify-center !text-[13px]" aria-pressed={option === o} onClick={() => setOption(o)}>
                    {o}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex gap-3">
            {!sold && left > 1 && <Stepper value={qty} min={1} max={left} onChange={setQty} />}
            <button className="btn btn-violet flex-1" disabled={sold || left === 0} onClick={add}>
              {sold ? "Agotado" : left === 0 ? "Ya está en tu carrito" : added ? <><IconCheck width={16} height={16} /> Añadido</> : "Añadir al carrito"}
            </button>
          </div>
          {!sold && inCart > 0 && (
            <button className="label mt-3 inline-flex items-center gap-2 hover:text-ink" onClick={cart.open}>
              Tienes {inCart} en el carrito · ver carrito <IconArrow width={13} height={13} />
            </button>
          )}

          {p.description && <p className="mt-8 whitespace-pre-line border-t border-line pt-6 text-muted">{p.description}</p>}

          {p.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2 border-t border-line pt-6">
              {p.tags.map((t) => (
                <Link key={t} href={`/tienda?tag=${encodeURIComponent(t)}`} className="chip">
                  #{t}
                </Link>
              ))}
            </div>
          )}
          <p className="mt-6 text-sm text-muted">Sin pagos en línea: envías tu pedido por WhatsApp y coordinas pago y entrega con la tienda.</p>
        </div>
      </div>

      {related.length > 0 && (
        <section className="pt-24">
          <h2 className="display mb-8 text-[clamp(2.2rem,5vw,4rem)]" data-reveal>También te puede gustar</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
