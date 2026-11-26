import { useRef, useState, type MouseEvent } from "react";
import { useLocation } from "wouter";
import { money } from "@shared/text";
import { useCatalog } from "@/lib/catalog";
import { flyToCart, morphTo } from "@/lib/fx";
import { cart } from "@/lib/store";
import type { Product } from "@/lib/trpc";
import { IconCheck, IconPlus, Mark } from "./ui";

export function ProductImage({ src, alt, className = "", eager = false }: { src?: string; alt: string; className?: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`grid place-items-center bg-raised text-muted/40 ${className}`} role="img" aria-label={alt}>
        <Mark className="w-1/3" weight={6} />
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} loading={eager ? "eager" : "lazy"} decoding="async" onError={() => setFailed(true)} />;
}

export function StockBadge({ p, low }: { p: Product; low: number }) {
  const base = "glass glass-dark inline-flex h-7 items-center rounded-full px-3 font-mono text-[10px] uppercase tracking-[0.14em]";
  if (p.stock <= 0) return <span className={base}>Agotado</span>;
  if (p.stock <= low) return <span className={`${base} !border-violet/70 text-violet`}>{p.stock === 1 ? "Última pieza" : `Últimas ${p.stock}`}</span>;
  return null;
}

export function ProductCard({ p, index = 0, className = "" }: { p: Product; index?: number; className?: string }) {
  const { catalog } = useCatalog();
  const [, navigate] = useLocation();
  const [added, setAdded] = useState(false);
  const shot = useRef<HTMLDivElement>(null);
  const sold = p.stock <= 0;
  const quickAdd = !sold && p.options.length === 0;
  const href = `/producto/${p.slug}`;

  const open = (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // abrir en pestaña nueva sigue funcionando
    e.preventDefault();
    morphTo(href, navigate, shot.current);
  };

  return (
    <a href={href} onClick={open} className={`group block ${className}`} data-reveal style={{ ["--i" as string]: index % 4 }}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-(--radius-card) border border-line transition-[border-color,box-shadow] duration-300 group-hover:border-violet group-hover:shadow-[0_0_34px_-8px_var(--glow)]">
        <div ref={shot} className="wipe h-full w-full overflow-hidden">
          <ProductImage src={p.images[0]?.thumbUrl} alt={p.name} className={`h-full w-full object-cover transition-transform duration-700 ease-expo group-hover:scale-[1.06] ${sold ? "opacity-45 grayscale" : ""}`} />
        </div>
        <div className="absolute left-2 top-2 z-[1]"><StockBadge p={p} low={catalog?.settings.lowStock ?? 2} /></div>
        {quickAdd && (
          <button
            className={`glass glass-dark absolute bottom-2 right-2 z-[3] grid h-11 w-11 place-items-center rounded-full transition-all duration-300 active:scale-90 ${added ? "!border-violet !bg-violet text-on-violet" : "hover:!border-violet"}`}
            aria-label={`Añadir ${p.name} al carrito`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!cart.add(p.id, "", 1, p.stock, p.name)) return;
              flyToCart(shot.current);
              setAdded(true);
              setTimeout(() => setAdded(false), 1400);
            }}
          >
            {added ? <IconCheck /> : <IconPlus />}
          </button>
        )}
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <h3 className="min-w-0 truncate font-mono text-[13px] leading-snug tracking-wide">{p.name}</h3>
        <span className="shrink-0 font-mono text-[13px] tabular-nums text-violet">{money(p.price)}</span>
      </div>
      {p.tags.length > 0 && <p className="mt-0.5 truncate font-mono text-[11px] text-muted">#{p.tags.slice(0, 2).join(" #")}</p>}
    </a>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="stagger-cols grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} p={p} index={i} />
      ))}
    </div>
  );
}
