import { useEffect, useState } from "react";
import { LOGO } from "./ui";

const SEEN = "aether-intro";

/** Marca el documento como "listo": a partir de ahí arrancan las animaciones del hero. */
function ready() {
  document.documentElement.dataset.ready = "true";
}

function shouldPlay() {
  try {
    if (sessionStorage.getItem(SEEN)) return false;
  } catch {
    return false;
  }
  return !location.pathname.startsWith("/admin") && !matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Entrada del logo: el triángulo se dibuja trazo a trazo, el triángulo interior entra girando,
 * aparecen las letras y el telón se levanta. Una vez por visita; se salta con un toque.
 */
export function Intro() {
  const [phase, setPhase] = useState<"play" | "leave" | "gone">(() => (shouldPlay() ? "play" : "gone"));

  useEffect(() => {
    if (phase === "gone") return ready();
    if (phase === "leave") {
      ready();
      const t = setTimeout(() => setPhase("gone"), 950);
      return () => clearTimeout(t);
    }
    try {
      sessionStorage.setItem(SEEN, "1");
    } catch {
      /* sin sessionStorage simplemente se repite */
    }
    const skip = () => setPhase("leave");
    const t = setTimeout(skip, 2600);
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", skip);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = "";
      window.removeEventListener("keydown", skip);
    };
  }, [phase]);

  if (phase === "gone") return null;
  const vars = (len: number, dur: number, delay: number) => ({ ["--len" as string]: len, ["--dur" as string]: `${dur}s`, ["--delay" as string]: `${delay}s` });

  return (
    <div className="intro" data-leaving={phase === "leave"} onClick={() => setPhase("leave")} role="presentation">
      <div className="relative flex flex-col items-center gap-9">
        <div className="halo pointer-events-none absolute left-1/2 top-[42%] -z-10 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: "radial-gradient(closest-side, var(--glow), transparent)" }} />
        <svg viewBox="-8 -10 472 414" className="w-[min(46vw,230px)] text-ink" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinejoin="round" aria-label="Aether">
          <path className="stroke" d={LOGO.outer} style={vars(1369, 1.25, 0)} />
          <path className="stroke" d={LOGO.medial} style={vars(685, 1, 0.4)} />
          <path className="spin text-violet" d={LOGO.inner} />
        </svg>
        <div className="pl-[0.34em] font-sans text-[clamp(26px,7vw,40px)] font-light uppercase tracking-[0.34em] text-ink">
          {"AETHER".split("").map((ch, i) => (
            <span key={i} className="letter" style={{ ["--i" as string]: i }}>
              {ch}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
