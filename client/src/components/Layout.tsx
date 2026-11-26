import { Link, useLocation } from "wouter";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useCatalog } from "@/lib/catalog";
import { cart, useCart } from "@/lib/store";
import { toggleTheme, useTheme } from "@/lib/theme";
import { IconArrow, IconBag, IconCheck, IconGrid, IconHome, IconMenu, IconMoon, IconSearch, IconSun, IconWhatsApp, IconX, Mark, Marquee, Wordmark } from "./ui";

export function waLink(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

const useCount = () => useCart().lines.reduce((a, l) => a + l.qty, 0);

function CartBadge({ count }: { count: number }) {
  if (!count) return null;
  return <span className="absolute -right-2 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-violet px-1 font-mono text-[10px] leading-none text-on-violet shadow-[0_0_12px_var(--violet)]">{count}</span>;
}

/** Línea violeta que avanza con la lectura de la página. */
function Progress() {
  useEffect(() => {
    const el = document.getElementById("progress")!;
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
  return <div id="progress" className="progress" aria-hidden="true" />;
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
    <header ref={ref} className="glass vt-top sticky top-0 z-40 !border-x-0 !border-t-0 !shadow-none" style={{ paddingTop: "env(safe-area-inset-top)" }}>
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
          <Link href="/tienda?buscar=1" className="hidden h-11 w-11 place-items-center hover:text-violet md:grid" aria-label="Buscar en la tienda"><IconSearch /></Link>
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

  const links = [
    { href: "/", label: "Inicio" },
    { href: "/tienda", label: "Tienda" },
    ...(catalog?.categories.map((c) => ({ href: `/tienda?cat=${c.slug}`, label: c.name })) ?? []),
  ];
  const social = [["Instagram", s?.instagram], ["TikTok", s?.tiktok], ["Facebook", s?.facebook]].filter((x): x is [string, string] => !!x[1]);

  return (
    <div className="menu glass-dark" data-open={open} role="dialog" aria-modal="true" aria-label="Menú" {...(!open ? { inert: true } : {})}>
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

/** Barra flotante del teléfono: lo importante siempre al alcance del pulgar. */
function Dock() {
  const [path] = useLocation();
  const count = useCount();
  if (path.startsWith("/producto/")) return null; // ahí manda la barra de compra del producto
  const item = "relative flex h-full flex-1 flex-col items-center justify-center gap-1 rounded-[18px] transition-colors active:bg-white/10";
  const on = (active: boolean) => (active ? "text-ink" : "text-muted");
  const dot = <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-violet shadow-[0_0_10px_2px_var(--violet)]" />;
  return (
    <nav className="glass glass-dark vt-dock fixed inset-x-3 z-40 flex h-[62px] items-stretch rounded-[22px] p-1 md:hidden" style={{ bottom: "calc(env(safe-area-inset-bottom) + 10px)" }} aria-label="Navegación rápida">
      <Link href="/" className={`${item} ${on(path === "/")}`} aria-current={path === "/" ? "page" : undefined}>
        <IconHome width={21} height={21} />
        <span className="font-mono text-[9px] uppercase tracking-[0.14em]">Inicio</span>
        {path === "/" && dot}
      </Link>
      <Link href="/tienda" className={`${item} ${on(path === "/tienda")}`} aria-current={path === "/tienda" ? "page" : undefined}>
        <IconGrid width={21} height={21} />
        <span className="font-mono text-[9px] uppercase tracking-[0.14em]">Tienda</span>
        {path === "/tienda" && dot}
      </Link>
      <Link href="/tienda?buscar=1" className={`${item} text-muted`}>
        <IconSearch width={21} height={21} />
        <span className="font-mono text-[9px] uppercase tracking-[0.14em]">Buscar</span>
      </Link>
      <button className={`${item} ${count ? "text-ink" : "text-muted"}`} onClick={cart.open} aria-label={`Abrir carrito, ${count} productos`}>
        <span className="relative" data-cart-target><IconBag width={21} height={21} /><CartBadge count={count} /></span>
        <span className="font-mono text-[9px] uppercase tracking-[0.14em]">Carrito</span>
      </button>
    </nav>
  );
}

function Toast() {
  const { toast } = useCart();
  const [path] = useLocation();
  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 z-[45] flex justify-center px-4 md:!bottom-8" style={{ bottom: `calc(env(safe-area-inset-bottom) + ${path.startsWith("/producto/") ? 92 : 84}px)` }} role="status">
      <button key={toast.id} className="toast glass glass-dark pointer-events-auto flex h-12 max-w-full items-center gap-3 rounded-full pl-4 pr-5 text-sm" onClick={cart.open}>
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet text-on-violet"><IconCheck width={14} height={14} /></span>
        <span className="truncate">{toast.text}</span>
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-violet">Ver carrito</span>
      </button>
    </div>
  );
}

export function Footer() {
  const { catalog } = useCatalog();
  const s = catalog?.settings;
  const social = [["Instagram", s?.instagram], ["TikTok", s?.tiktok], ["Facebook", s?.facebook]].filter((x): x is [string, string] => !!x[1]);

  return (
    <footer className="mt-28 border-t border-line pb-24 md:pb-0">
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
        <div className="wrap flex justify-between gap-4 pb-6 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          <span>© {new Date().getFullYear()} Aether</span>
          <span className="text-right">Hay espacio para todos los estilos</span>
        </div>
      </div>
    </footer>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState(false);
  return (
    <>
      <Progress />
      <Header onMenu={() => setMenu(true)} />
      <main className="min-h-[70vh]">{children}</main>
      <Footer />
      <Dock />
      <Toast />
      <Menu open={menu} onClose={() => setMenu(false)} />
    </>
  );
}
