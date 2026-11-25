import { useState } from "react";
import { Link } from "wouter";
import { money } from "@shared/text";
import { useCatalog } from "@/lib/catalog";
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
  if (p.stock <= 0) return <span className="bg-ink px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-bg">Agotado</span>;
  if (p.stock <= low) return <span className="bg-violet px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-on-violet">{p.stock === 1 ? "Última pieza" : `Últimas ${p.stock}`}</span>;
  return null;
}

export function ProductCard({ p, index = 0 }: { p: Product; index?: number }) {
  const { catalog } = useCatalog();
  const [added, setAdded] = useState(false);
  const sold = p.stock <= 0;
  const quickAdd = !sold && p.options.length === 0;

  return (
    <Link href={`/producto/${p.slug}`} className="group block" data-reveal style={{ ["--i" as string]: index % 4 }}>
      <div className="ticks relative aspect-[4/5] overflow-hidden border border-line transition-colors duration-300 group-hover:border-violet">
        <ProductImage
          src={p.images[0]?.thumbUrl}
          alt={p.name}
          className={`h-full w-full object-cover transition-transform duration-700 ease-expo group-hover:scale-[1.06] ${sold ? "opacity-45 grayscale" : ""}`}
        />
        <div className="absolute left-0 top-0 z-[1]">
          <StockBadge p={p} low={catalog?.settings.lowStock ?? 2} />
        </div>
        {quickAdd && (
          <button
            className="absolute bottom-0 right-0 z-[3] grid h-11 w-11 place-items-center border-l border-t border-line bg-bg/90 text-ink backdrop-blur transition-colors hover:bg-violet hover:text-on-violet"
            aria-label={`Añadir ${p.name} al carrito`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              cart.add(p.id, "", 1, p.stock);
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
    </Link>
  );
}

export function ProductGrid({ products, eager = 0 }: { products: Product[]; eager?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} p={p} index={i} />
      ))}
    </div>
  );
}
