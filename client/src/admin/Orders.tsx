import { useState } from "react";
import { money, type OrderStatus } from "@shared/text";
import { errorText, trpc } from "@/lib/trpc";
import { IconWhatsApp } from "@/components/ui";

const LABEL: Record<OrderStatus, string> = { pendiente: "Pendientes", confirmado: "Confirmados", cancelado: "Cancelados" };

/** Lleva un teléfono local venezolano (0412…) a formato internacional para abrir el chat. */
function chatUrl(phone: string) {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("0") && d.length === 11) d = "58" + d.slice(1);
  return `https://wa.me/${d}`;
}

export default function Orders() {
  const utils = trpc.useUtils();
  // Se actualiza solo: un pedido nuevo aparece sin tener que recargar.
  const orders = trpc.admin.orders.useQuery(undefined, { staleTime: 0, refetchInterval: 30_000, refetchOnWindowFocus: true });
  const [tab, setTab] = useState<OrderStatus>("pendiente");
  const [error, setError] = useState("");
  const setStatus = trpc.admin.setOrderStatus.useMutation({
    onSuccess: () => (utils.admin.invalidate(), utils.shop.catalog.invalidate()),
    onError: (e) => setError(errorText(e)),
  });
  const list = (orders.data ?? []).filter((o) => o.status === tab);
  const act = (id: number, status: OrderStatus) => (setError(""), setStatus.mutate({ id, status }));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="display text-4xl md:text-5xl">Pedidos</h1>
      <p className="mt-2 text-sm text-muted">Al <strong>confirmar la venta</strong> las piezas se descuentan solas del inventario. Si la anulas, vuelven.</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {(Object.keys(LABEL) as OrderStatus[]).map((s) => (
          <button key={s} className="chip !min-h-11 justify-center" aria-pressed={tab === s} onClick={() => setTab(s)}>
            {LABEL[s]} <span className="opacity-70">{(orders.data ?? []).filter((o) => o.status === s).length}</span>
          </button>
        ))}
      </div>
      {error && <p className="mt-4 rounded-(--radius-ctl) border border-danger/50 p-3 text-sm text-danger" role="alert">{error}</p>}

      <ul className="mt-5 space-y-4">
        {list.map((o) => (
          <li key={o.id} className="overflow-hidden rounded-(--radius-card) border border-line bg-surface">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-dashed border-line p-4">
              <div>
                <p className="font-mono text-lg">#{o.code}</p>
                <p className="label mt-0.5">{new Date(o.createdAt).toLocaleString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              <p className="font-mono text-2xl tabular-nums text-violet">{money(o.total)}</p>
            </div>
            <div className="grid gap-x-6 gap-y-1 border-b border-dashed border-line p-4 text-sm sm:grid-cols-2">
              <p><span className="text-muted">Cliente:</span> {o.customerName}</p>
              <p><span className="text-muted">Pago:</span> {o.paymentMethod}</p>
              <p><span className="text-muted">Teléfono:</span> {o.customerPhone}</p>
              {o.note && <p className="sm:col-span-2"><span className="text-muted">Nota:</span> {o.note}</p>}
            </div>
            <ul className="space-y-1 border-b border-dashed border-line p-4 font-mono text-[13px]">
              {o.items.map((i, k) => (
                <li key={k} className="flex justify-between gap-4">
                  <span>{i.qty} × {i.name}{i.option ? ` (${i.option})` : ""}</span>
                  <span className="tabular-nums">{money(i.price * i.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-2 gap-2 p-4">
              {o.status === "pendiente" && (
                <>
                  <button className="btn btn-violet col-span-2" disabled={setStatus.isPending} onClick={() => act(o.id, "confirmado")}>Confirmar venta</button>
                  <a className="btn btn-ghost" href={chatUrl(o.customerPhone)} target="_blank" rel="noreferrer"><IconWhatsApp width={17} height={17} /> Escribirle</a>
                  <button className="btn btn-ghost" disabled={setStatus.isPending} onClick={() => confirm(`¿Cancelar el pedido #${o.code}?`) && act(o.id, "cancelado")}>Cancelar</button>
                </>
              )}
              {o.status === "confirmado" && (
                <>
                  <a className="btn btn-ghost" href={chatUrl(o.customerPhone)} target="_blank" rel="noreferrer"><IconWhatsApp width={17} height={17} /> Escribirle</a>
                  <button className="btn btn-ghost" disabled={setStatus.isPending} onClick={() => confirm("¿Anular esta venta? Las piezas vuelven al inventario.") && act(o.id, "cancelado")}>Anular venta</button>
                </>
              )}
              {o.status === "cancelado" && <button className="btn btn-ghost col-span-2" disabled={setStatus.isPending} onClick={() => act(o.id, "pendiente")}>Reabrir pedido</button>}
            </div>
          </li>
        ))}
        {!list.length && <li className="rounded-(--radius-card) border border-line py-16 text-center text-muted">{orders.isLoading ? "Cargando…" : `No hay pedidos ${LABEL[tab].toLowerCase()}.`}</li>}
      </ul>
    </div>
  );
}
