import { Link, useLocation } from "wouter";
import type { ReactNode } from "react";
import { useCatalog } from "@/lib/catalog";
import { cart, useCart } from "@/lib/store";
import { toggleTheme, useTheme } from "@/lib/theme";
import { IconBag, IconMoon, IconSearch, IconSun, IconWhatsApp, Mark, Marquee, Wordmark } from "./ui";

export function Header() {
  const { catalog } = useCatalog();
  const { lines } = useCart();
  const theme = useTheme();
  const [path] = useLocation();
  const count = lines.reduce((a, l) => a + l.qty, 0);
  const announcement = catalog?.settings.announcement;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
      {announcement && (
        <Marquee items={[announcement, announcement, announcement]} speed={42} className="border-b border-line py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted" />
      )}
      <div className="wrap flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3" aria-label="Aether, inicio">
          <Mark className="h-7 w-auto" weight={22} />
          <Wordmark className="text-[17px]" />
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Secciones">
          <Link href="/tienda" className={`label transition-colors hover:text-ink ${path === "/tienda" ? "!text-ink" : ""}`}>
            Tienda
          </Link>
          {catalog?.categories.map((c) => (
            <Link key={c.id} href={`/tienda?cat=${c.slug}`} className="label transition-colors hover:text-ink">
              {c.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-center">
          <Link href="/tienda?buscar=1" className="grid h-11 w-11 place-items-center hover:text-violet" aria-label="Buscar en la tienda">
            <IconSearch />
          </Link>
          <button
            className="grid h-11 w-11 place-items-center hover:text-violet"
            onClick={(e) => toggleTheme({ x: e.clientX, y: e.clientY })}
            aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          >
            {theme === "dark" ? <IconSun /> : <IconMoon />}
          </button>
          <button className="relative ml-1 flex h-11 items-center gap-2 border border-line px-3 transition-colors hover:border-violet" onClick={cart.open} aria-label={`Abrir carrito, ${count} productos`}>
            <IconBag />
            <span className="font-mono text-xs tabular-nums">{String(count).padStart(2, "0")}</span>
            {count > 0 && <span className="absolute -right-1 -top-1 h-2 w-2 bg-violet shadow-[0_0_10px_var(--violet)]" />}
          </button>
        </div>
      </div>
    </header>
  );
}

export function waLink(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

export function Footer() {
  const { catalog } = useCatalog();
  const s = catalog?.settings;
  const social = [
    ["Instagram", s?.instagram],
    ["TikTok", s?.tiktok],
    ["Facebook", s?.facebook],
  ].filter((x): x is [string, string] => !!x[1]);

  return (
    <footer className="mt-28 border-t border-line">
      <div className="wrap grid gap-12 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="display text-[clamp(2rem,4.2vw,3.4rem)]">
            Diseñado para aquellos que les gusta verse <span className="text-violet">facheros</span>.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <p className="label">Tienda</p>
          <Link href="/tienda" className="hover:text-violet">
            Todo el catálogo
          </Link>
          {catalog?.categories.map((c) => (
            <Link key={c.id} href={`/tienda?cat=${c.slug}`} className="hover:text-violet">
              {c.name}
            </Link>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <p className="label">Contacto</p>
          {s?.whatsapp && (
            <a href={waLink(s.whatsapp, "Hola Aether ▲")} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-violet">
              <IconWhatsApp width={18} height={18} /> WhatsApp
            </a>
          )}
          {s?.email && (
            <a href={`mailto:${s.email}`} className="break-all hover:text-violet">
              {s.email}
            </a>
          )}
          {social.map(([name, url]) => (
            <a key={name} href={url} target="_blank" rel="noreferrer" className="hover:text-violet">
              {name}
            </a>
          ))}
        </div>
      </div>
      <div className="overflow-hidden border-t border-line">
        <div className="wrap flex items-end justify-between gap-6 pb-6 pt-8">
          <Wordmark className="text-[clamp(3rem,15vw,13rem)] leading-[0.8] !tracking-[0.18em] text-ink/90" />
          <Mark className="mb-2 hidden h-[clamp(3rem,9vw,8rem)] w-auto text-violet sm:block" weight={6} />
        </div>
        <div className="wrap flex justify-between pb-6 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          <span>© {new Date().getFullYear()} Aether</span>
          <span>Hay espacio para todos los estilos</span>
        </div>
      </div>
    </footer>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-[70vh]">{children}</main>
      <Footer />
    </>
  );
}
