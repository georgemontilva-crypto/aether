import { Link, useLocation } from "wouter";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useCatalog } from "@/lib/catalog";
import { cart, useCart } from "@/lib/store";
import { toggleTheme, useTheme } from "@/lib/theme";
import { IconArrow, IconBag, IconCheck, IconMenu, IconMoon, IconSearch, IconSun, IconWhatsApp, IconX, Mark, Marquee, usePresence, Wordmark } from "./ui";

export function waLink(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

const useCount = () => useCart().lines.reduce((a, l) => a + l.qty, 0);

function CartBadge({ count }: { count: number }) {
  if (!count) return null;
  return <span className="absolute -right-2 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-violet px-1 font-mono text-[10px] leading-none text-on-violet shadow-[0_0_12px_var(--violet)]">{count}</span>;
}

/** Línea violeta en el borde del encabezado que avanza con la lectura de la página. */
function Progress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current!;
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      el.style.setProperty("--p", max > 0 ? String(Math.min(1, scrollY / max)) : "0");
    };
    const on = () => (raf ||= requestAnimationFrame(update));
    update();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, []);
  return <div ref={ref} className="progress" aria-hidden="true" />;
}

export function Header({ onMenu }: { onMenu: () => void }) {
  const { catalog } = useCatalog();
  const count = useCount();
  const theme = useTheme();
  const [path] = useLocation();
  const announcement = catalog?.settings.announcement;

  // La altura real del encabezado (cambia si hay cinta de anuncio) queda en --header-h
  // para que los filtros de la tienda se peguen justo debajo.
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current!;
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty("--header-h", `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <header ref={ref} className="topbar vt-top" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      {announcement && <Marquee items={[announcement, announcement, announcement]} speed={42} className="border-b border-line py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted" />}
      <div className="wrap flex h-14 items-center justify-between gap-4 md:h-16">
        <Link href="/" className="flex items-center gap-3" aria-label="Aether, inicio">
          <Mark className="h-7 w-auto" weight={22} />
          <Wordmark className="text-[17px]" />
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Secciones">
          <Link href="/tienda" className={`label transition-colors hover:text-ink ${path === "/tienda" ? "!text-ink" : ""}`}>Tienda</Link>
          {catalog?.categories.map((c) => (
            <Link key={c.id} href={`/tienda?cat=${c.slug}`} className="label transition-colors hover:text-ink">{c.name}</Link>
          ))}
        </nav>

        <div className="flex items-center">
          <Link href="/tienda?buscar=1" className="grid h-11 w-11 place-items-center hover:text-violet" aria-label="Buscar en la tienda"><IconSearch /></Link>
          <button className="grid h-11 w-11 place-items-center hover:text-violet" onClick={(e) => toggleTheme({ x: e.clientX, y: e.clientY })} aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}>
            {theme === "dark" ? <IconSun /> : <IconMoon />}
          </button>
          <button className="relative ml-1 hidden h-11 items-center gap-2 rounded-full border border-line px-4 transition-colors hover:border-violet md:flex" onClick={cart.open} aria-label={`Abrir carrito, ${count} productos`} data-cart-target>
            <IconBag />
            <span className="font-mono text-xs tabular-nums">{String(count).padStart(2, "0")}</span>
          </button>
          <button className="-mr-2 grid h-11 w-11 place-items-center md:hidden" onClick={onMenu} aria-label="Abrir menú"><IconMenu width={24} height={24} /></button>
        </div>
      </div>
      <Progress />
    </header>
  );
}

/** Menú a pantalla completa en vidrio oscuro: la página se sigue adivinando detrás. */
function Menu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { catalog } = useCatalog();
  const theme = useTheme();
  const s = catalog?.settings;

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const { mounted, shown } = usePresence(open, 480);
  const links = [
    { href: "/", label: "Inicio" },
    { href: "/tienda", label: "Tienda" },
    ...(catalog?.categories.map((c) => ({ href: `/tienda?cat=${c.slug}`, label: c.name })) ?? []),
  ];
  const social = [["Instagram", s?.instagram], ["TikTok", s?.tiktok], ["Facebook", s?.facebook]].filter((x): x is [string, string] => !!x[1]);

  if (!mounted) return null;
  return (
    <div className="menu glass-dark" data-open={shown} role="dialog" aria-modal="true" aria-label="Menú">
      <div className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full" style={{ background: "radial-gradient(closest-side, var(--glow), transparent)" }} />
      <div className="pointer-events-none absolute -left-32 bottom-20 h-96 w-96 rounded-full opacity-70" style={{ background: "radial-gradient(closest-side, var(--glow), transparent)" }} />
      <div className="relative flex h-full flex-col px-6" style={{ paddingTop: "calc(env(safe-area-inset-top) + 14px)", paddingBottom: "calc(env(safe-area-inset-bottom) + 22px)" }}>
        <div className="flex items-center justify-between">
          <span className="label">Menú</span>
          <button className="glass -mr-1 grid h-12 w-12 place-items-center rounded-full" onClick={onClose} aria-label="Cerrar menú"><IconX /></button>
        </div>
        <nav className="mt-6 flex flex-1 flex-col justify-center gap-1" aria-label="Navegación">
          {links.map((l, i) => (
            <Link key={l.href} href={l.href} onClick={onClose} className="menu-item group flex items-baseline gap-4 py-1.5" style={{ ["--i" as string]: i }}>
              <span className="w-6 font-mono text-[11px] text-violet">{String(i + 1).padStart(2, "0")}</span>
              <span className="display text-[clamp(2.6rem,12.5vw,4.2rem)] transition-colors group-active:text-violet">{l.label}</span>
            </Link>
          ))}
          <a href="/#encargos" onClick={onClose} className="menu-item mt-4 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.18em] text-muted" style={{ ["--i" as string]: links.length }}>
            <span className="text-violet">▲</span> Encargos cada mes <IconArrow width={14} height={14} />
          </a>
        </nav>
        <div className="menu-item flex flex-wrap items-center gap-2" style={{ ["--i" as string]: links.length + 1 }}>
          {s?.whatsapp && (
            <a href={waLink(s.whatsapp, "Hola Aether ▲")} target="_blank" rel="noreferrer" className="glass inline-flex h-12 items-center gap-2 rounded-full px-5 text-sm"><IconWhatsApp width={18} height={18} /> WhatsApp</a>
          )}
          {social.map(([name, url]) => (
            <a key={name} href={url} target="_blank" rel="noreferrer" className="glass inline-flex h-12 items-center rounded-full px-5 text-sm">{name}</a>
          ))}
          <button className="glass ml-auto grid h-12 w-12 place-items-center rounded-full" onClick={(e) => toggleTheme({ x: e.clientX, y: e.clientY })} aria-label="Cambiar tema">
            {theme === "dark" ? <IconSun /> : <IconMoon />}
          </button>
        </div>
      </div>
    </div>
  );
}

/** En el teléfono, el carrito es un único botón flotante de vidrio (en escritorio va en el encabezado). */
function CartFab() {
  const count = useCount();
  return (
    <button
      className="glass glass-dark vt-dock fixed right-4 z-40 grid h-[60px] w-[60px] place-items-center rounded-full transition-transform active:scale-90 md:hidden"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
      onClick={cart.open}
      aria-label={`Abrir carrito, ${count} productos`}
    >
      <span className="relative" data-cart-target>
        <IconBag width={24} height={24} />
        <CartBadge count={count} />
      </span>
    </button>
  );
}

function Toast() {
  const { toast } = useCart();
  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed left-4 right-[88px] z-[45] flex md:inset-x-0 md:!bottom-8 md:justify-center" style={{ bottom: "calc(env(safe-area-inset-bottom) + 22px)" }} role="status">
      <button key={toast.id} className="toast glass glass-dark pointer-events-auto flex h-12 min-w-0 items-center gap-3 rounded-full pl-3 pr-5 text-sm" onClick={cart.open}>
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet text-on-violet"><IconCheck width={14} height={14} /></span>
        <span className="truncate">{toast.text}</span>
      </button>
    </div>
  );
}

export function Footer() {
  const { catalog } = useCatalog();
  const s = catalog?.settings;
  const social = [["Instagram", s?.instagram], ["TikTok", s?.tiktok], ["Facebook", s?.facebook]].filter((x): x is [string, string] => !!x[1]);

  return (
    <footer className="mt-28 border-t border-line pb-16 md:pb-0">
      <div className="wrap grid gap-12 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <p className="display text-[clamp(2.2rem,4.2vw,3.4rem)]">Diseñado para aquellos que les gusta verse <span className="text-violet">facheros</span>.</p>
        <div className="flex flex-col gap-3">
          <p className="label">Tienda</p>
          <Link href="/tienda" className="hover:text-violet">Todo el catálogo</Link>
          {catalog?.categories.map((c) => (
            <Link key={c.id} href={`/tienda?cat=${c.slug}`} className="hover:text-violet">{c.name}</Link>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <p className="label">Contacto</p>
          {s?.whatsapp && <a href={waLink(s.whatsapp, "Hola Aether ▲")} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-violet"><IconWhatsApp width={18} height={18} /> WhatsApp</a>}
          {s?.email && <a href={`mailto:${s.email}`} className="break-all hover:text-violet">{s.email}</a>}
          {social.map(([name, url]) => (
            <a key={name} href={url} target="_blank" rel="noreferrer" className="hover:text-violet">{name}</a>
          ))}
        </div>
      </div>
      <div className="overflow-hidden border-t border-line">
        <div className="wrap flex items-end justify-between gap-6 pb-6 pt-8">
          <Wordmark className="text-[clamp(3rem,15vw,13rem)] leading-[0.8] !tracking-[0.18em] text-ink/90" />
          <Mark className="mb-2 hidden h-[clamp(3rem,9vw,8rem)] w-auto text-violet sm:block" weight={6} />
        </div>
        <div className="wrap flex flex-wrap items-center justify-between gap-x-6 gap-y-3 pb-6 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          <span>© {new Date().getFullYear()} Aether</span>
          <span className="hidden md:inline">Hay espacio para todos los estilos</span>
          <a href="https://www.gammalabstudio.com" target="_blank" rel="noopener" className="group inline-flex min-h-11 items-center gap-1.5 transition-colors hover:text-ink">
            Made by <span className="text-ink transition-colors group-hover:text-violet">Gammalab</span>
            <span aria-hidden="true" className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">↗</span>
          </a>
        </div>
      </div>
    </footer>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState(false);
  return (
    <>
      <Header onMenu={() => setMenu(true)} />
      {/* El encabezado es fijo: este hueco le guarda el sitio. */}
      <div style={{ height: "var(--header-h, 3.5rem)" }} />
      <main className="min-h-[70vh]">{children}</main>
      <Footer />
      <CartFab />
      <Toast />
      <Menu open={menu} onClose={() => setMenu(false)} />
    </>
  );
}
