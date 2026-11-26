import { useSyncExternalStore } from "react";

/* Mini store: carrito (guardado en el teléfono del cliente) + estado del cajón. */
export type CartLine = { productId: number; option: string; qty: number };
type State = { lines: CartLine[]; open: boolean; toast: { id: number; text: string } | null };

const KEY = "aether-cart";
let state: State = { lines: load(), open: false, toast: null };
let toastTimer: ReturnType<typeof setTimeout>;
const listeners = new Set<() => void>();

function load(): CartLine[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((l) => Number.isInteger(l?.productId) && l.qty > 0) : [];
  } catch {
    return [];
  }
}
function set(next: Partial<State>) {
  state = { ...state, ...next };
  if (next.lines) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state.lines));
    } catch {
      /* modo privado: el carrito vive solo en memoria */
    }
  }
  listeners.forEach((l) => l());
}
const same = (l: CartLine, productId: number, option: string) => l.productId === productId && l.option === option;

export const cart = {
  /** Añade sin abrir el carrito (no interrumpe la compra): avisa con un mensaje y devuelve si entró. */
  add(productId: number, option: string, qty: number, max: number, name = "") {
    const others = state.lines.filter((l) => l.productId === productId && l.option !== option).reduce((a, l) => a + l.qty, 0);
    const current = state.lines.find((l) => same(l, productId, option))?.qty ?? 0;
    const next = Math.min(current + qty, Math.max(0, max - others));
    if (next <= current) {
      cart.say(max > 0 ? "Ya tienes todas las que quedan" : "Agotado");
      return false;
    }
    set({ lines: current ? state.lines.map((l) => (same(l, productId, option) ? { ...l, qty: next } : l)) : [...state.lines, { productId, option, qty: next }] });
    cart.say(name ? `${name} · añadido` : "Añadido al carrito");
    try {
      navigator.vibrate?.(12);
    } catch {
      /* sin vibración */
    }
    return true;
  },
  say(text: string) {
    clearTimeout(toastTimer);
    set({ toast: { id: Date.now(), text } });
    toastTimer = setTimeout(() => set({ toast: null }), 2600);
  },
  setQty(productId: number, option: string, qty: number) {
    set({ lines: qty <= 0 ? state.lines.filter((l) => !same(l, productId, option)) : state.lines.map((l) => (same(l, productId, option) ? { ...l, qty } : l)) });
  },
  clear: () => set({ lines: [] }),
  open: () => set({ open: true, toast: null }),
  close: () => set({ open: false }),
};

export function useCart() {
  return useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    () => state,
  );
}
