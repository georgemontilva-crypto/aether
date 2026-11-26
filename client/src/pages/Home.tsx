import { useEffect, useRef } from "react";
import { Link } from "wouter";
import { useCatalog } from "@/lib/catalog";
import { waLink } from "@/components/Layout";
import { Portal } from "@/components/Portal";
import { ProductCard, ProductImage } from "@/components/ProductCard";
import { IconArrow, IconWhatsApp, Marquee, useReveal } from "@/components/ui";

export default function Home() {
  const { catalog } = useCatalog();
  const ref = useReveal<HTMLDivElement>();
  const products = catalog?.products ?? [];
  const featured = products.filter((p) => p.featured && p.stock > 0);
  const fresh = (featured.length >= 4 ? featured : products.filter((p) => p.stock > 0)).slice(0, 8);
  const total = products.reduce((a, p) => a + (p.stock > 0 ? 1 : 0), 0);

  // Al bajar, el portal se acerca, gira y se disuelve: la página "entra" por el triángulo.
  const hero = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = hero.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      el.style.setProperty("--s", String(Math.max(0, Math.min(1, scrollY / (el.offsetHeight * 0.9)))));
    };
    const on = () => (raf ||= requestAnimationFrame(update));
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <div ref={ref}>
      {/* ── Hero ── */}
      <section ref={hero} className="relative overflow-hidden border-b border-line">
        <div className="wrap relative grid min-h-[calc(100svh-6rem)] items-center gap-4 pb-12 pt-6 md:py-10 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
          <div className="order-2 lg:order-1" style={{ transform: "translateY(calc(var(--s, 0) * -36px))" }}>
            <p className="label rise" style={{ ["--i" as string]: 0 }}>
              <span className="text-violet">▲</span> El quinto elemento
            </p>
            <h1 className="display rise mt-5 text-[clamp(3.6rem,11.5vw,10rem)] !leading-[0.84]" style={{ ["--i" as string]: 1 }}>
              Descubre
              <br />
              tu <span className="shimmer">estilo</span>.
            </h1>
            <p className="rise mt-7 max-w-[30rem] text-lg text-muted" style={{ ["--i" as string]: 2 }}>
              ¿Streetwear? ¿Fairycore? ¿Y2K? ¿Goth? En Aether hay espacio para todos los estilos.
            </p>
            <div className="rise mt-9 flex flex-wrap gap-3" style={{ ["--i" as string]: 3 }}>
              <Link href="/tienda" className="btn btn-violet">
                Explorar la tienda <IconArrow width={16} height={16} />
              </Link>
              <a href="#encargos" className="btn btn-ghost">
                Encargos
              </a>
            </div>
            <dl className="rise mt-12 flex gap-10 border-t border-line pt-5" style={{ ["--i" as string]: 4 }}>
              {[
                [String(total || "—"), "piezas disponibles"],
                [String(catalog?.categories.length ?? "—"), "secciones"],
                ["30", "días para encargos"],
              ].map(([n, l]) => (
                <div key={l}>
                  <dt className="font-mono text-2xl tabular-nums">{n}</dt>
                  <dd className="label mt-1">{l}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="rise relative order-1 lg:order-2" style={{ ["--i" as string]: 2 }}>
            <div className="will-change-transform" style={{ transform: "scale(calc(1 + var(--s, 0) * 0.5)) rotate(calc(var(--s, 0) * 14deg))", opacity: "calc(1 - var(--s, 0) * 0.85)" }}>
              <div className="pointer-events-none absolute left-1/2 top-[58%] h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: "radial-gradient(closest-side, var(--glow), transparent 70%)" }} />
              <Portal className="relative mx-auto block aspect-[1/0.9] w-[min(92vw,460px)] lg:w-full lg:max-w-[640px]" />
            </div>
          </div>
        </div>
      </section>

      <Marquee items={["Streetwear", "Fairycore", "Y2K", "Goth", "Coquette", "Cybercore", "Harajuku"]} className="display border-b border-line py-5 text-[clamp(2rem,5vw,3.6rem)]" speed={30} />

      {/* ── Secciones ── */}
      <section className="wrap pt-20">
        <div className="mb-8 flex items-end justify-between gap-4" data-reveal>
          <h2 className="display text-[clamp(2.6rem,6vw,5rem)]">Secciones</h2>
          <span className="label lg:hidden">Desliza →</span>
        </div>
        <div className="snap-row lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-5 lg:overflow-visible lg:px-0">
          {catalog?.categories.map((c, i) => {
            const inCat = products.filter((p) => p.categoryId === c.id);
            return (
              <Link key={c.id} href={`/tienda?cat=${c.slug}`} className="group block w-[72vw] max-w-[340px] lg:w-auto lg:max-w-none" data-reveal style={{ ["--i" as string]: i }}>
                <div className="relative aspect-[3/4] overflow-hidden rounded-(--radius-card) border border-line transition-colors duration-300 group-hover:border-violet">
                  <ProductImage src={inCat.find((p) => p.stock > 0)?.images[0]?.url ?? inCat[0]?.images[0]?.url} alt="" className="h-full w-full object-cover opacity-80 transition-all duration-700 ease-expo group-hover:scale-105 group-hover:opacity-100" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4 text-white">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/70">{String(inCat.length).padStart(2, "0")} piezas</p>
                      <p className="display mt-1 text-[clamp(2.4rem,3.4vw,2.8rem)]">{c.name}</p>
                    </div>
                    <IconArrow className="mb-1.5 transition-transform duration-500 ease-expo group-hover:translate-x-1.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Recién llegados ── */}
      <section className="wrap pt-24">
        <div className="mb-8 flex items-end justify-between gap-4" data-reveal>
          <h2 className="display text-[clamp(2.6rem,6vw,5rem)]">{featured.length >= 4 ? "Destacados" : "Recién llegados"}</h2>
          <Link href="/tienda" className="label inline-flex items-center gap-2 hover:text-ink">
            Ver todo <IconArrow width={14} height={14} />
          </Link>
        </div>
        <div className="snap-row md:mx-0 md:grid md:grid-cols-4 md:gap-x-5 md:gap-y-8 md:overflow-visible md:px-0">
          {fresh.map((p, i) => (
            <ProductCard key={p.id} p={p} index={i} className="w-[58vw] max-w-[280px] md:w-auto md:max-w-none" />
          ))}
          <Link href="/tienda" className="glass grid w-[44vw] max-w-[220px] place-items-center self-stretch rounded-(--radius-card) md:hidden" data-reveal>
            <span className="flex flex-col items-center gap-3 text-center">
              <span className="display text-3xl">Ver todo</span>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-violet text-on-violet"><IconArrow width={18} height={18} /></span>
            </span>
          </Link>
        </div>
      </section>

      {/* ── Encargos ── */}
      <section id="encargos" className="wrap scroll-mt-28 pt-24">
        <div className="relative overflow-hidden rounded-(--radius-panel) border border-line p-7 sm:p-12" data-reveal>
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full" style={{ background: "radial-gradient(closest-side, var(--glow), transparent)" }} />
          <p className="label">
            <span className="text-violet">▲</span> Encargos cada mes
          </p>
          <h2 className="display mt-4 max-w-[16ch] text-[clamp(2.4rem,6vw,5rem)]">¿Buscas algo fuera del catálogo?</h2>
          <p className="mt-5 max-w-[34rem] text-lg text-muted">Puedes encargar cualquier cosa, dentro y fuera del catálogo, y en un mes la entregamos en tus manos.</p>
          {catalog?.settings.whatsapp && (
            <a href={waLink(catalog.settings.whatsapp, "Hola Aether ▲ quiero hacer un encargo:")} target="_blank" rel="noreferrer" className="btn mt-8">
              <IconWhatsApp width={18} height={18} /> Pedir un encargo
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
