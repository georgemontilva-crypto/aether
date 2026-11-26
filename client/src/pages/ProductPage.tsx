import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "wouter";
import { money } from "@shared/text";
import { useCatalog } from "@/lib/catalog";
import { flyToCart } from "@/lib/fx";
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
  const hero = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const optionsBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShot(0);
    setOption("");
    setQty(1);
    setAdded(false);
    window.scrollTo({ top: 0, behavior: "instant" });
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
    if (p.options.length && !option) {
      setNeedOption(true);
      optionsBox.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (cart.add(p.id, option, Math.min(qty, left), p.stock, p.name)) {
      flyToCart(hero.current);
      setAdded(true);
      setQty(1);
      setTimeout(() => setAdded(false), 1600);
    }
  };
  const addLabel = sold ? "Agotado" : left === 0 ? "Ya está en tu carrito" : added ? <><IconCheck width={16} height={16} /> Añadido</> : "Añadir al carrito";

  return (
    <div ref={ref} className="wrap pb-10 pt-4 md:pt-6">
      <nav className="label flex flex-wrap items-center gap-2" aria-label="Ruta">
        <Link href="/tienda" className="hover:text-ink">Tienda</Link>
        <span>/</span>
        {category && <Link href={`/tienda?cat=${category.slug}`} className="hover:text-ink">{category.name}</Link>}
      </nav>

      <div className="mt-5 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <div className="lg:ml-auto lg:w-full lg:max-w-[560px]">
          {/* Teléfono: fotos a todo el ancho, se pasan con el dedo. Escritorio: foto grande + miniaturas. */}
          <div key={p.id} ref={hero} data-product-hero className="relative overflow-hidden rounded-(--radius-panel) border border-line" style={{ viewTransitionName: "product-shot" }}>
            <div ref={strip} className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] md:block md:overflow-visible [&::-webkit-scrollbar]:hidden" onScroll={(e) => setShot(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
              {(p.images.length ? p.images : [undefined]).map((img, i) => (
                <ProductImage key={img?.id ?? "x"} src={img?.url} alt={p.name} eager={i === 0} className={`aspect-[4/5] w-full shrink-0 snap-center object-cover ${i === shot ? "" : "md:hidden"} ${sold ? "opacity-50 grayscale" : ""}`} />
              ))}
            </div>
            <div className="absolute left-3 top-3"><StockBadge p={p} low={catalog!.settings.lowStock} /></div>
            {p.images.length > 1 && (
              <div className="glass glass-dark absolute bottom-3 left-1/2 flex h-7 -translate-x-1/2 items-center gap-1.5 rounded-full px-3 md:hidden" aria-hidden="true">
                {p.images.map((img, i) => <span key={img.id} className={`h-1.5 rounded-full transition-all duration-300 ${i === shot ? "w-4 bg-violet" : "w-1.5 bg-white/50"}`} />)}
              </div>
            )}
          </div>
          {p.images.length > 1 && (
            <div className="scroll-x mt-3 !hidden md:!flex">
              {p.images.map((img, i) => (
                <button key={img.id} onClick={() => setShot(i)} className={`h-20 w-16 shrink-0 overflow-hidden rounded-(--radius-ctl) border ${i === shot ? "border-violet" : "border-line opacity-60 hover:opacity-100"}`} aria-label={`Foto ${i + 1}`} aria-pressed={i === shot}>
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
            <span className={`h-2 w-2 rounded-full ${sold ? "bg-danger" : "bg-ok shadow-[0_0_10px_var(--ok)]"}`} />
            {sold ? "Agotado por ahora" : p.stock > catalog!.settings.lowStock ? "Disponible" : p.stock === 1 ? "Última pieza" : `Últimas ${p.stock} piezas`}
          </p>

          {p.options.length > 0 && (
            <div className="mt-7" ref={optionsBox}>
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
            <button className="btn btn-violet flex-1" disabled={sold || left === 0} onClick={add}>{addLabel}</button>
          </div>
          {!sold && inCart > 0 && (
            <button className="label mt-3 inline-flex min-h-11 items-center gap-2 hover:text-ink" onClick={cart.open}>
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
