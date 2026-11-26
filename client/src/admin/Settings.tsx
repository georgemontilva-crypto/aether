import { useState } from "react";
import { errorText, trpc, type AdminData } from "@/lib/trpc";
import { IconX } from "@/components/ui";

export default function Settings({ data }: { data: AdminData }) {
  const utils = trpc.useUtils();
  const refresh = () => Promise.all([utils.admin.data.invalidate(), utils.shop.catalog.invalidate()]);
  const [s, setS] = useState({ ...data.settings, lowStock: String(data.settings.lowStock) });
  const [method, setMethod] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [newCat, setNewCat] = useState("");
  const [catError, setCatError] = useState("");

  const save = trpc.admin.saveSettings.useMutation({
    onSuccess: async () => (await refresh(), setMsg({ ok: true, text: "Ajustes guardados ✓" })),
    onError: (e) => setMsg({ ok: false, text: errorText(e) }),
  });
  const catOpts = { onSuccess: () => (setCatError(""), setNewCat(""), void refresh()), onError: (e: unknown) => setCatError(errorText(e)) };
  const saveCat = trpc.admin.saveCategory.useMutation(catOpts);
  const delCat = trpc.admin.deleteCategory.useMutation(catOpts);
  const logout = trpc.admin.logout.useMutation({ onSuccess: () => utils.admin.invalidate() });

  const addMethod = () => {
    const m = method.trim();
    if (m && !s.paymentMethods.includes(m)) setS({ ...s, paymentMethods: [...s.paymentMethods, m] });
    setMethod("");
  };
  const text = (key: "whatsapp" | "announcement" | "instagram" | "tiktok" | "facebook" | "email", label: string, placeholder = "", hint = "") => (
    <label className="block">
      <span className="label mb-2 block">{label}{hint && <span className="normal-case tracking-normal"> · {hint}</span>}</span>
      <input className="field" value={s[key]} onChange={(e) => setS({ ...s, [key]: e.target.value })} placeholder={placeholder} />
    </label>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-12 pb-6">
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          setMsg(null);
          save.mutate({ ...s, lowStock: Number(s.lowStock) || 0 });
        }}
      >
        <h1 className="display text-4xl md:text-5xl">Ajustes</h1>
        {text("whatsapp", "WhatsApp de la tienda", "584246069516", "con código de país; aquí llegan los pedidos")}
        <div>
          <span className="label mb-2 block">Métodos de pago <span className="normal-case tracking-normal">· los que el cliente puede elegir</span></span>
          <div className="flex flex-wrap gap-2">
            {s.paymentMethods.map((m) => (
              <span key={m} className="chip !min-h-10 !text-ink">
                {m}
                <button type="button" className="-mr-2 grid h-9 w-9 place-items-center" onClick={() => setS({ ...s, paymentMethods: s.paymentMethods.filter((x) => x !== m) })} aria-label={`Quitar ${m}`}><IconX width={13} height={13} /></button>
              </span>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input className="field" value={method} onChange={(e) => setMethod(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMethod())} placeholder="Añadir método (ej: Transferencia)" />
            <button type="button" className="btn" onClick={addMethod}>Añadir</button>
          </div>
        </div>
        {text("announcement", "Cinta de anuncio", "", "el texto que corre arriba; vacío = sin cinta")}
        <label className="block">
          <span className="label mb-2 block">Avisar "stock bajo" cuando queden <span className="normal-case tracking-normal">· o menos</span></span>
          <input className="field !w-28 font-mono" inputMode="numeric" value={s.lowStock} onChange={(e) => setS({ ...s, lowStock: e.target.value.replace(/\D/g, "") })} />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          {text("instagram", "Instagram", "https://instagram.com/…")}
          {text("tiktok", "TikTok", "https://tiktok.com/@…")}
          {text("facebook", "Facebook", "https://facebook.com/…")}
          {text("email", "Correo", "")}
        </div>
        {msg && <p className={`text-sm ${msg.ok ? "text-ok" : "text-danger"}`} role="status">{msg.text}</p>}
        <button className="btn btn-violet" disabled={save.isPending}>{save.isPending ? "Guardando…" : "Guardar ajustes"}</button>
      </form>

      <section>
        <h2 className="display text-4xl">Categorías</h2>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {data.categories.map((c) => {
            const n = data.products.filter((p) => p.categoryId === c.id).length;
            return (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span>{c.name} <span className="label ml-2">{n} productos</span></span>
                <span className="flex gap-1">
                  <button className="btn btn-ghost btn-sm !min-h-11" onClick={() => { const name = prompt("Nuevo nombre de la categoría", c.name); if (name?.trim()) saveCat.mutate({ id: c.id, name }); }}>Renombrar</button>
                  <button className="btn btn-ghost btn-sm !min-h-11" disabled={n > 0} title={n > 0 ? "Tiene productos" : ""} onClick={() => confirm(`¿Borrar la categoría "${c.name}"?`) && delCat.mutate({ id: c.id })}>Borrar</button>
                </span>
              </li>
            );
          })}
        </ul>
        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (newCat.trim()) saveCat.mutate({ name: newCat }); }}>
          <input className="field" value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Nueva categoría" maxLength={80} />
          <button className="btn">Añadir</button>
        </form>
        {catError && <p className="mt-2 text-sm text-danger" role="alert">{catError}</p>}
      </section>

      <section className="border-t border-line pt-8">
        <h2 className="display text-4xl">En tu teléfono</h2>
        <p className="mt-3 text-sm text-muted">
          Puedes dejar este panel como una app en la pantalla de inicio. <strong className="text-ink">Android (Chrome):</strong> menú ⋮ → "Añadir a pantalla de inicio". <strong className="text-ink">iPhone (Safari):</strong> botón Compartir → "Añadir a inicio".
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <a href="/" target="_blank" rel="noreferrer" className="btn btn-ghost">Ver la tienda ↗</a>
          <button className="btn btn-ghost" onClick={() => logout.mutate()}>Cerrar sesión</button>
        </div>
      </section>
    </div>
  );
}
