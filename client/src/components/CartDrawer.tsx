import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { money } from "@shared/text";
import { useCatalog } from "@/lib/catalog";
import { cart, useCart } from "@/lib/store";
import { errorText, trpc } from "@/lib/trpc";
import { ProductImage } from "./ProductCard";
import { IconArrow, IconTrash, IconWhatsApp, IconX, Mark, Stepper } from "./ui";

const CUSTOMER = "aether-cliente";

export function CartDrawer() {
  const { lines, open } = useCart();
  const { catalog, refetch } = useCatalog();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"carrito" | "datos">("carrito");
  const [form, setForm] = useState(() => {
    try {
      return { name: "", phone: "", paymentMethod: "", note: "", ...JSON.parse(localStorage.getItem(CUSTOMER) ?? "{}") };
    } catch {
      return { name: "", phone: "", paymentMethod: "", note: "" };
    }
  });
  const [error, setError] = useState("");
  const create = trpc.shop.createOrder.useMutation();

  // Cada línea del carrito con su producto actual: precio y existencias siempre al día.
  const rows = useMemo(() => {
    if (!catalog) return [];
    return lines.flatMap((l) => {
      const p = catalog.products.find((x) => x.id === l.productId);
      return p ? [{ ...l, p, short: l.qty > p.stock }] : [];
    });
  }, [lines, catalog]);
  const total = rows.reduce((a, r) => a + r.p.price * r.qty, 0);
  const blocked = rows.some((r) => r.short);
  const methods = catalog?.settings.paymentMethods ?? [];

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && cart.close();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  useEffect(() => {
    if (!open) setStep("carrito");
    setError("");
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.paymentMethod) return setError("Elige un método de pago");
    try {
      localStorage.setItem(CUSTOMER, JSON.stringify({ name: form.name, phone: form.phone, paymentMethod: form.paymentMethod }));
    } catch {
      /* no pasa nada si no se puede recordar */
    }
    try {
      const res = await create.mutateAsync({ ...form, items: rows.map((r) => ({ productId: r.productId, qty: r.qty, option: r.option })) });
      cart.clear();
      cart.close();
      setForm((f: typeof form) => ({ ...f, note: "" }));
      navigate(`/pedido/${res.code}?wa=1`);
    } catch (err) {
      setError(errorText(err));
      void refetch();
      setStep("carrito");
    }
  };

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div className={`absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-500 ${open ? "opacity-100" : "opacity-0"}`} onClick={cart.close} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de compras"
        className={`absolute right-0 top-0 flex h-full w-full max-w-[460px] flex-col border-l border-line bg-bg transition-transform duration-500 ease-expo ${open ? "translate-x-0" : "translate-x-full"}`}
        {...(!open ? { inert: true } : {})}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
          <div className="flex items-baseline gap-3">
            <h2 className="display text-3xl">{step === "carrito" ? "Tu carrito" : "Tus datos"}</h2>
            <span className="label">{step === "carrito" ? "01 / 02" : "02 / 02"}</span>
          </div>
          <button className="grid h-11 w-11 place-items-center hover:text-violet" onClick={cart.close} aria-label="Cerrar carrito">
            <IconX />
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
            <Mark className="w-20 text-line" weight={6} />
            <p className="text-muted">Tu carrito está vacío. El vacío es lindo, pero mejor llénalo.</p>
            <button
              className="btn"
              onClick={() => {
                cart.close();
                navigate("/tienda");
              }}
            >
              Ir a la tienda
            </button>
          </div>
        ) : step === "carrito" ? (
          <>
            <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
              {rows.map((r) => (
                <li key={`${r.productId}-${r.option}`} className="flex gap-4 py-4">
                  <ProductImage src={r.p.images[0]?.thumbUrl} alt={r.p.name} className="h-24 w-20 shrink-0 border border-line object-cover" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex justify-between gap-2">
                      <p className="truncate font-mono text-[13px]">{r.p.name}</p>
                      <p className="shrink-0 font-mono text-[13px] tabular-nums">{money(r.p.price * r.qty)}</p>
                    </div>
                    {r.option && <p className="label mt-0.5">Opción: {r.option}</p>}
                    {r.short && (
                      <p className="mt-1 text-xs text-danger">{r.p.stock === 0 ? "Se agotó. Quítalo para continuar." : `Solo ${r.p.stock === 1 ? "queda 1" : `quedan ${r.p.stock}`}. Baja la cantidad.`}</p>
                    )}
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <Stepper small value={r.qty} min={1} max={Math.max(r.p.stock, r.qty)} onChange={(n) => n <= r.p.stock || n < r.qty ? cart.setQty(r.productId, r.option, n) : undefined} />
                      <button className="grid h-9 w-9 place-items-center text-muted hover:text-danger" onClick={() => cart.setQty(r.productId, r.option, 0)} aria-label={`Quitar ${r.p.name}`}>
                        <IconTrash width={17} height={17} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="shrink-0 border-t border-line p-5">
              {error && <p className="mb-3 border border-danger/50 p-3 text-sm text-danger" role="alert">{error}</p>}
              <div className="mb-4 flex items-baseline justify-between">
                <span className="label">Total</span>
                <span className="font-mono text-2xl tabular-nums">{money(total)}</span>
              </div>
              <button className="btn btn-violet w-full" disabled={blocked} onClick={() => setStep("datos")}>
                Continuar <IconArrow width={16} height={16} />
              </button>
              <p className="mt-3 text-center text-xs text-muted">Sin pagos en línea: coordinas el pago por WhatsApp con la tienda.</p>
            </div>
          </>
        ) : (
          <form onSubmit={submit} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <label className="block">
                <span className="label mb-2 block">Nombre</span>
                <input className="field" required minLength={2} maxLength={120} autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="¿Cómo te llamas?" />
              </label>
              <label className="block">
                <span className="label mb-2 block">Número de teléfono</span>
                <input className="field" required minLength={7} maxLength={40} type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0412 000 0000" />
              </label>
              <fieldset>
                <legend className="label mb-2">Método de pago</legend>
                <div className="flex flex-wrap gap-2">
                  {methods.map((m) => (
                    <button type="button" key={m} className="chip !min-h-11 !px-4 !text-[13px]" aria-pressed={form.paymentMethod === m} onClick={() => setForm({ ...form, paymentMethod: m })}>
                      {m}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className="block">
                <span className="label mb-2 block">Nota (opcional)</span>
                <textarea className="field min-h-20 resize-none" maxLength={500} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Algo que debamos saber" />
              </label>
              <div className="border border-line p-4">
                <p className="label mb-2">Resumen</p>
                {rows.map((r) => (
                  <div key={`${r.productId}-${r.option}`} className="flex justify-between gap-3 py-0.5 font-mono text-xs">
                    <span className="truncate text-muted">
                      {r.qty} × {r.p.name}
                      {r.option ? ` (${r.option})` : ""}
                    </span>
                    <span className="tabular-nums">{money(r.p.price * r.qty)}</span>
                  </div>
                ))}
                <div className="mt-2 flex justify-between border-t border-line pt-2 font-mono text-sm">
                  <span>Total</span>
                  <span className="tabular-nums">{money(total)}</span>
                </div>
              </div>
            </div>
            <div className="shrink-0 border-t border-line p-5">
              {error && <p className="mb-3 border border-danger/50 p-3 text-sm text-danger" role="alert">{error}</p>}
              <div className="flex gap-2">
                <button type="button" className="btn btn-ghost" onClick={() => setStep("carrito")}>
                  Atrás
                </button>
                <button className="btn btn-violet flex-1" disabled={create.isPending}>
                  <IconWhatsApp width={18} height={18} />
                  {create.isPending ? "Enviando…" : "Enviar pedido"}
                </button>
              </div>
              <p className="mt-3 text-center text-xs text-muted">Se abrirá WhatsApp con tu pedido listo para enviar a la tienda.</p>
            </div>
          </form>
        )}
      </aside>
    </div>
  );
}
