import { useSyncExternalStore } from "react";

/* Mini store: carrito (guardado en el teléfono del cliente) + estado del cajón. */
export type CartLine = { productId: number; option: string; qty: number };
type State = { lines: CartLine[]; open: boolean };

const KEY = "aether-cart";
let state: State = { lines: load(), open: false };
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
  add(productId: number, option: string, qty: number, max: number) {
    const others = state.lines.filter((l) => l.productId === productId && l.option !== option).reduce((a, l) => a + l.qty, 0);
    const current = state.lines.find((l) => same(l, productId, option))?.qty ?? 0;
    const next = Math.min(current + qty, Math.max(0, max - others));
    if (next <= 0) return false;
    set({ lines: current ? state.lines.map((l) => (same(l, productId, option) ? { ...l, qty: next } : l)) : [...state.lines, { productId, option, qty: next }], open: true });
    return next > current;
  },
  setQty(productId: number, option: string, qty: number) {
    set({ lines: qty <= 0 ? state.lines.filter((l) => !same(l, productId, option)) : state.lines.map((l) => (same(l, productId, option) ? { ...l, qty } : l)) });
  },
  clear: () => set({ lines: [] }),
  open: () => set({ open: true }),
  close: () => set({ open: false }),
};

export function useCart() {
  return useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    () => state,
  );
}
