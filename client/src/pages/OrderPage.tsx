import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { money } from "@shared/text";
import { trpc } from "@/lib/trpc";
import { IconWhatsApp, Mark } from "@/components/ui";
import NotFound from "./NotFound";

const STATUS: Record<string, string> = { pendiente: "Pendiente de confirmar", confirmado: "Confirmado", cancelado: "Cancelado" };

export default function OrderPage() {
  const { code } = useParams<{ code: string }>();
  const order = trpc.shop.order.useQuery({ code: code ?? "" }, { retry: false, staleTime: 0 });
  // Recién creado (?wa=1): se abre WhatsApp solo, una única vez.
  const [auto] = useState(() => new URLSearchParams(location.search).get("wa") === "1");
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (auto) history.replaceState(null, "", location.pathname);
  }, [auto]);
  useEffect(() => {
    if (!auto || !order.data) return;
    if (count === 0) {
      location.href = order.data.whatsappUrl;
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 800);
    return () => clearTimeout(t);
  }, [auto, order.data, count]);

  if (order.isLoading) return <div className="wrap grid min-h-[60vh] place-items-center"><span className="label animate-pulse">Cargando pedido…</span></div>;
  if (!order.data) return <NotFound />;
  const o = order.data;

  return (
    <div className="wrap flex flex-col items-center pt-12">
      <Mark className="rise w-14 text-violet" weight={8} />
      <h1 className="display rise mt-5 text-center text-[clamp(2.6rem,8vw,5rem)]" style={{ ["--i" as string]: 1 }}>
        {o.status === "pendiente" ? "Pedido listo." : STATUS[o.status] + "."}
      </h1>
      {o.status === "pendiente" && (
        <p className="rise mt-3 max-w-md text-center text-muted" style={{ ["--i" as string]: 2 }}>
          Falta un paso: envíalo por WhatsApp a la tienda para coordinar el pago y la entrega.
        </p>
      )}

      <article className="rise mt-8 w-full max-w-md border border-line bg-surface font-mono text-sm" style={{ ["--i" as string]: 3 }} aria-label="Recibo del pedido">
        <header className="flex items-center justify-between border-b border-dashed border-line p-5">
          <div>
            <p className="label">Pedido</p>
            <p className="mt-0.5 text-lg">#{o.code}</p>
          </div>
          <div className="text-right">
            <p className="label">{new Date(o.createdAt).toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" })}</p>
            <p className={`mt-0.5 text-xs uppercase tracking-widest ${o.status === "confirmado" ? "text-ok" : o.status === "cancelado" ? "text-danger" : "text-violet"}`}>{STATUS[o.status]}</p>
          </div>
        </header>
        <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 border-b border-dashed border-line p-5 text-[13px]">
          <dt className="text-muted">Cliente</dt><dd className="text-right">{o.customerName}</dd>
          <dt className="text-muted">Teléfono</dt><dd className="text-right">{o.customerPhone}</dd>
          <dt className="text-muted">Pago</dt><dd className="text-right">{o.paymentMethod}</dd>
          {o.note && <><dt className="text-muted">Nota</dt><dd className="text-right">{o.note}</dd></>}
        </dl>
        <ul className="space-y-2 border-b border-dashed border-line p-5 text-[13px]">
          {o.items.map((i, k) => (
            <li key={k} className="flex justify-between gap-4">
              <span>{i.qty} × {i.name}{i.option ? ` (${i.option})` : ""}</span>
              <span className="shrink-0 tabular-nums">{money(i.price * i.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-baseline justify-between p-5">
          <span className="label">Total</span>
          <span className="text-2xl tabular-nums">{money(o.total)}</span>
        </div>
      </article>

      {o.status !== "cancelado" && (
        <a href={o.whatsappUrl} className="btn btn-violet mt-6 w-full max-w-md" onClick={() => setCount(-1)}>
          <IconWhatsApp width={18} height={18} />
          {auto && count > 0 ? `Abriendo WhatsApp en ${count}…` : "Enviar pedido por WhatsApp"}
        </a>
      )}
      <Link href="/tienda" className="label mt-5 hover:text-ink">
        Seguir viendo la tienda
      </Link>
    </div>
  );
}
