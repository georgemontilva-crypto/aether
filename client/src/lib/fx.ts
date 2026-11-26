import { flushSync } from "react-dom";

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Navega con transición: la foto tocada viaja hasta convertirse en la foto grande del producto.
 * Donde el navegador no lo soporta, navega normal.
 */
export function morphTo(href: string, navigate: (to: string) => void, shot?: HTMLElement | null) {
  const go = () => {
    flushSync(() => navigate(href));
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  if (!document.startViewTransition || reduced()) return go();
  // Solo un elemento puede llevar el nombre a la vez: se lo quita la foto grande actual (si la hay).
  document.querySelectorAll<HTMLElement>("[data-product-hero]").forEach((e) => (e.style.viewTransitionName = "none"));
  if (shot) shot.style.viewTransitionName = "product-shot";
  document.startViewTransition(go).finished.finally(() => {
    if (shot) shot.style.viewTransitionName = "";
  });
}

/** La miniatura del producto vuela hasta el icono del carrito. */
export function flyToCart(from: HTMLElement | null) {
  const target = [...document.querySelectorAll<HTMLElement>("[data-cart-target]")].find((e) => e.offsetParent !== null || e.getClientRects().length);
  if (target) {
    target.classList.remove("bump");
    void target.offsetWidth;
    target.classList.add("bump");
  }
  const img = from?.querySelector("img") ?? (from instanceof HTMLImageElement ? from : null);
  if (!img || !target || reduced()) return;
  const a = img.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const ghost = img.cloneNode() as HTMLImageElement;
  Object.assign(ghost.style, { position: "fixed", left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px`, objectFit: "cover", zIndex: "90", pointerEvents: "none", borderRadius: "0", margin: "0", transformOrigin: "top left" });
  ghost.className = "";
  document.body.appendChild(ghost);
  const scale = 26 / a.width;
  const dx = b.left + b.width / 2 - 13 - a.left;
  const dy = b.top + b.height / 2 - 13 - a.top;
  ghost
    .animate(
      [
        { transform: "translate(0,0) scale(1)", opacity: 0.95, borderRadius: "0" },
        { transform: `translate(${dx * 0.55}px, ${dy * 0.35 - 40}px) scale(${Math.max(scale, 0.45)})`, opacity: 0.95, offset: 0.55 },
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0.2, borderRadius: "50%" },
      ],
      { duration: 720, easing: "cubic-bezier(0.5, 0, 0.2, 1)" },
    )
    .finished.finally(() => ghost.remove());
}
