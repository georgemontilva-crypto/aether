import { useEffect, useRef, type ReactNode, type SVGProps } from "react";

/* ── Logo ────────────────────────────────────────────────────────────────── */
// Geometría exacta del logo: triángulo exterior, triángulo medial y el triángulo girado inscrito.
export const LOGO = {
  outer: "M228 0 456 395H0Z",
  medial: "M114 197.5h228L228 395Z",
  inner: "M257.6 197.5 270.2 321.9 156.2 270.6Z",
};

export function Mark({ className = "", weight = 5 }: { className?: string; weight?: number }) {
  return (
    <svg viewBox="-8 -10 472 414" className={className} fill="none" stroke="currentColor" strokeWidth={weight} strokeLinejoin="round" aria-hidden="true">
      <path d={LOGO.outer} />
      <path d={LOGO.medial} />
      <path d={LOGO.inner} />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return <span className={`font-sans font-light uppercase tracking-[0.34em] ${className}`}>Aether</span>;
}

/* ── Iconos (trazo fino, como el logo) ───────────────────────────────────── */
const base: SVGProps<SVGSVGElement> = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
const icon = (d: ReactNode) => (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}>{d}</svg>;

export const IconSearch = icon(<><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>);
export const IconBag = icon(<><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></>);
export const IconSun = icon(<><circle cx="12" cy="12" r="3.6" /><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" /></>);
export const IconMoon = icon(<path d="M19.5 14.2A8 8 0 0 1 9.8 4.5a8 8 0 1 0 9.7 9.7Z" />);
export const IconPlus = icon(<path d="M12 5v14M5 12h14" />);
export const IconMinus = icon(<path d="M5 12h14" />);
export const IconX = icon(<path d="m6 6 12 12M18 6 6 18" />);
export const IconArrow = icon(<path d="M4 12h16m-6-6 6 6-6 6" />);
export const IconCheck = icon(<path d="m5 12.5 4.5 4.5L19 7.5" />);
export const IconTrash = icon(<path d="M4 7h16M9 7V4.5h6V7m-8.5 0 1 13h9l1-13M10 11v5.5M14 11v5.5" />);
export const IconUp = icon(<path d="m6 14 6-6 6 6" />);
export const IconWhatsApp = icon(<><path d="M3.5 20.5l1.3-4.3A8.5 8.5 0 1 1 8 19.3l-4.5 1.2Z" /><path d="M9.2 8.3c-.4 2.9 3.3 6.7 6.4 6.4l.9-1.4-1.9-1.2-.9.8c-1-.4-2-1.4-2.4-2.4l.8-.9-1.2-1.9-1.7.6Z" /></>);

/* ── Aparición al hacer scroll ───────────────────────────────────────────── */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const els = [root, ...root.querySelectorAll<HTMLElement>("[data-reveal]")].filter((e) => e.hasAttribute("data-reveal"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  });
  return ref;
}

export function Marquee({ items, speed = 36, className = "" }: { items: string[]; speed?: number; className?: string }) {
  const row = (hidden: boolean) => (
    <div aria-hidden={hidden || undefined}>
      {items.map((t, i) => (
        <span key={i} className="flex items-center gap-[1.2em] px-[0.6em]">
          {t}
          <span className="text-violet">▲</span>
        </span>
      ))}
    </div>
  );
  return (
    <div className={`marquee ${className}`} style={{ ["--speed" as string]: `${speed}s` }}>
      {row(false)}
      {row(true)}
    </div>
  );
}

export function Stepper({ value, min = 0, max, onChange, small = false }: { value: number; min?: number; max: number; onChange: (n: number) => void; small?: boolean }) {
  const size = small ? "h-9 w-9" : "h-12 w-12";
  return (
    <div className="inline-flex items-center border border-line">
      <button type="button" className={`${size} grid place-items-center hover:bg-raised disabled:opacity-30`} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Quitar uno">
        <IconMinus width={16} height={16} />
      </button>
      <span className={`${small ? "w-8" : "w-10"} text-center font-mono text-sm tabular-nums`} aria-live="polite">{value}</span>
      <button type="button" className={`${size} grid place-items-center hover:bg-raised disabled:opacity-30`} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Agregar uno">
        <IconPlus width={16} height={16} />
      </button>
    </div>
  );
}
