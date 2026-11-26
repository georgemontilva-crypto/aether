import { flushSync } from "react-dom";
import { useEffect, useState } from "react";

export type Theme = "dark" | "light";
const current = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");

function apply(t: Theme) {
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t === "dark" ? "#07060a" : "#f4f1f7");
  try {
    localStorage.setItem("aether-theme", t);
  } catch {
    /* sin almacenamiento: el tema dura la visita */
  }
  window.dispatchEvent(new Event("aether-theme"));
}

/** Cambia el tema; si el navegador lo permite, el nuevo se abre en círculo desde el botón pulsado. */
export function toggleTheme(origin?: { x: number; y: number }) {
  const next: Theme = current() === "dark" ? "light" : "dark";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.startViewTransition || reduce) return apply(next);
  const root = document.documentElement;
  root.style.setProperty("--vt-x", `${origin?.x ?? innerWidth / 2}px`);
  root.style.setProperty("--vt-y", `${origin?.y ?? 0}px`);
  root.classList.add("vt-theme");
  document.startViewTransition(() => flushSync(() => apply(next))).finished.finally(() => root.classList.remove("vt-theme"));
}

export function useTheme(): Theme {
  const [t, setT] = useState<Theme>(current);
  useEffect(() => {
    const on = () => setT(current());
    window.addEventListener("aether-theme", on);
    return () => window.removeEventListener("aether-theme", on);
  }, []);
  return t;
}
