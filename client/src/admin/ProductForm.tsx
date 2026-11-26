import { useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { cleanTag } from "@shared/text";
import { errorText, trpc, type AdminData } from "@/lib/trpc";
import { IconCamera, IconImage, IconX } from "@/components/ui";

type Photo = { id?: number; url: string; thumbUrl: string; storageKey: string | null };

/**
 * Las fotos de un teléfono pesan 4–12 MB. Antes de subirlas se reducen aquí mismo a 2000 px:
 * suben en segundos aunque la señal sea mala y no gastan los datos de quien administra la tienda.
 */
async function shrink(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.size < 700_000) return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.86));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file; // formato que el navegador no sabe leer: que lo intente el servidor
  }
}

export default function ProductForm({ data, id }: { data: AdminData; id?: number }) {
  const existing = id ? data.products.find((p) => p.id === id) : undefined;
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();
  const [f, setF] = useState({
    name: existing?.name ?? "",
    price: existing ? String(existing.price) : "",
    categoryId: existing?.categoryId ?? data.categories[0]?.id ?? 0,
    description: existing?.description ?? "",
    options: existing?.options.join(", ") ?? "",
    stock: String(existing?.stock ?? 1),
    active: existing?.active ?? true,
    featured: existing?.featured ?? false,
  });
  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);
  const [tagDraft, setTagDraft] = useState("");
  const [photos, setPhotos] = useState<Photo[]>(existing?.images ?? []);
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState("");
  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const [touch] = useState(() => matchMedia("(pointer: coarse)").matches);

  const done = async () => {
    await Promise.all([utils.admin.data.invalidate(), utils.shop.catalog.invalidate()]);
    navigate("/admin");
  };
  const save = trpc.admin.saveProduct.useMutation({ onSuccess: done, onError: (e) => setError(errorText(e)) });
  const remove = trpc.admin.deleteProduct.useMutation({ onSuccess: done, onError: (e) => setError(errorText(e)) });

  if (id && !existing) return <p className="py-20 text-center text-muted">Ese producto ya no existe. <Link href="/admin" className="underline">Volver</Link></p>;

  const addTags = (raw: string) => {
    const next = raw.split(/[\s,]+/).map(cleanTag).filter(Boolean);
    if (next.length) setTags((t) => [...new Set([...t, ...next])]);
    setTagDraft("");
  };
  const suggestions = [...new Set(data.products.flatMap((p) => p.tags))].filter((t) => !tags.includes(t)).slice(0, 14);

  // De una en una: cada foto aparece apenas sube y, si una falla, las demás no se pierden.
  const upload = async (list: FileList | null) => {
    const files = [...(list ?? [])];
    if (!files.length) return;
    setError("");
    try {
      for (const [i, f] of files.entries()) {
        setUploading({ done: i, total: files.length });
        const body = new FormData();
        body.append("fotos", await shrink(f), f.name);
        const res = await fetch("/api/admin/upload", { method: "POST", body, credentials: "include" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? "No se pudo subir la foto. Revisa la conexión e intenta de nuevo.");
        setPhotos((p) => [...p, ...json.images]);
      }
    } catch (e) {
      setError(errorText(e));
    } finally {
      setUploading(null);
      if (gallery.current) gallery.current.value = "";
      if (camera.current) camera.current.value = "";
    }
  };
  const move = (i: number, d: number) =>
    setPhotos((p) => {
      const next = [...p];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });

  const noStorage = data.storage.mode === "none";
  const tile = "flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-(--radius-ctl) border border-dashed border-line text-muted transition-colors hover:border-violet hover:text-violet active:bg-raised disabled:opacity-50";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const price = Number(f.price.replace(",", "."));
    if (!Number.isFinite(price) || price < 0) return setError("Revisa el precio");
    save.mutate({
      id,
      name: f.name,
      price,
      categoryId: f.categoryId,
      description: f.description,
      tags: [...tags, ...tagDraft.split(/[\s,]+/).map(cleanTag).filter(Boolean)],
      options: f.options.split(",").map((o) => o.trim()).filter(Boolean),
      stock: Math.max(0, Math.round(Number(f.stock) || 0)),
      active: f.active,
      featured: f.featured,
      images: photos,
    });
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl pb-28">
      <Link href="/admin" className="label -ml-1 inline-flex min-h-11 items-center px-1 hover:text-ink">← Inventario</Link>
      <h1 className="display text-4xl md:text-5xl">{existing ? "Editar producto" : "Nuevo producto"}</h1>

      <section className="mt-8">
        <p className="label mb-2">Fotos <span className="normal-case tracking-normal">· la primera es la principal</span></p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {photos.map((ph, i) => (
            <div key={ph.url} className="group relative aspect-[4/5] overflow-hidden rounded-(--radius-ctl) border border-line">
              <img src={ph.thumbUrl} alt="" className="h-full w-full object-cover" />
              {i === 0 && <span className="absolute left-1.5 top-1.5 rounded-full bg-violet px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-on-violet">Principal</span>}
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/70 text-white">
                <button type="button" className="grid h-10 flex-1 place-items-center disabled:opacity-25" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Mover antes">←</button>
                <button type="button" className="grid h-10 flex-1 place-items-center hover:text-danger" onClick={() => setPhotos((p) => p.filter((_, k) => k !== i))} aria-label="Quitar foto"><IconX width={15} height={15} /></button>
                <button type="button" className="grid h-10 flex-1 place-items-center disabled:opacity-25" disabled={i === photos.length - 1} onClick={() => move(i, 1)} aria-label="Mover después">→</button>
              </div>
            </div>
          ))}
          {touch && (
            <button type="button" className={tile} onClick={() => camera.current?.click()} disabled={!!uploading || noStorage}>
              <IconCamera width={26} height={26} />
              <span className="font-mono text-[10px] uppercase tracking-widest">Cámara</span>
            </button>
          )}
          <button
            type="button"
            className={tile}
            onClick={() => gallery.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void upload(e.dataTransfer.files);
            }}
            disabled={!!uploading || noStorage}
          >
            <IconImage width={26} height={26} />
            <span className="px-1 text-center font-mono text-[10px] uppercase tracking-widest">{uploading ? `Subiendo ${uploading.done + 1} de ${uploading.total}…` : touch ? "Galería" : "Añadir fotos"}</span>
          </button>
        </div>
        <input ref={gallery} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
        <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => upload(e.target.files)} />
        {noStorage && <p className="mt-2 text-sm text-danger">Para subir fotos falta conectar R2 (variables R2_* en Railway).</p>}
      </section>

      <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="label mb-2 block">Nombre</span>
          <input className="field" required maxLength={160} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </label>
        <label className="block">
          <span className="label mb-2 block">Precio ($)</span>
          <input className="field font-mono" required inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} placeholder="0.00" />
        </label>
        <label className="block">
          <span className="label mb-2 block">Piezas en existencia</span>
          <input className="field font-mono" required inputMode="numeric" pattern="[0-9]*" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value.replace(/\D/g, "") })} />
        </label>
        <label className="block sm:col-span-2">
          <span className="label mb-2 block">Categoría</span>
          <div className="flex flex-wrap gap-2">
            {data.categories.map((c) => (
              <button type="button" key={c.id} className="chip !min-h-11 !px-4 !text-[13px]" aria-pressed={f.categoryId === c.id} onClick={() => setF({ ...f, categoryId: c.id })}>{c.name}</button>
            ))}
          </div>
        </label>

        <div className="min-w-0 sm:col-span-2">
          <span className="label mb-2 block">Hashtags <span className="normal-case tracking-normal">· así lo encuentran al buscar ("collar", "plata"…)</span></span>
          <div className="field flex !min-h-12 flex-wrap items-center gap-1.5 !p-2">
            {tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-0.5 rounded-full bg-violet pl-3 font-mono text-[13px] text-on-violet">
                #{t}
                <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} aria-label={`Quitar #${t}`} className="grid h-9 w-8 place-items-center"><IconX width={13} height={13} /></button>
              </span>
            ))}
            <input
              className="min-w-[120px] flex-1 bg-transparent px-1 py-1.5 font-mono text-base focus:outline-none"
              autoCapitalize="none"
              autoCorrect="off"
              enterKeyHint="done"
              value={tagDraft}
              onChange={(e) => (/[\s,]$/.test(e.target.value) ? addTags(e.target.value) : setTagDraft(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.preventDefault(), addTags(tagDraft));
                if (e.key === "Backspace" && !tagDraft) setTags(tags.slice(0, -1));
              }}
              onBlur={() => addTags(tagDraft)}
              placeholder={tags.length ? "" : "escribe y pulsa espacio"}
              aria-label="Añadir hashtag"
            />
          </div>
          {suggestions.length > 0 && (
            <div className="scroll-x mt-2">
              {suggestions.map((t) => (
                <button type="button" key={t} className="chip !text-[12px]" onClick={() => setTags([...tags, t])}>+ #{t}</button>
              ))}
            </div>
          )}
        </div>

        <label className="block sm:col-span-2">
          <span className="label mb-2 block">Tallas u opciones <span className="normal-case tracking-normal">· opcional, separadas por coma</span></span>
          <input className="field" maxLength={300} value={f.options} onChange={(e) => setF({ ...f, options: e.target.value })} placeholder="Ej: 8, 9, 10  ·  S, M, L  ·  negro, blanco" />
        </label>
        <label className="block sm:col-span-2">
          <span className="label mb-2 block">Descripción <span className="normal-case tracking-normal">· opcional</span></span>
          <textarea className="field min-h-28" maxLength={4000} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </label>
        {([["active", "Visible en la tienda"], ["featured", "Destacado en el inicio"]] as const).map(([key, label]) => (
          <label key={key} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-(--radius-ctl) border border-line px-4">
            <input type="checkbox" className="h-5 w-5 accent-[var(--violet)]" checked={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.checked })} />
            <span>{label}</span>
          </label>
        ))}
      </div>

      {error && <p className="mt-5 rounded-(--radius-ctl) border border-danger/50 p-3 text-sm text-danger" role="alert">{error}</p>}

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-bg/95 backdrop-blur-md md:bottom-0">
        <div className="mx-auto flex max-w-3xl gap-2 px-4 py-3">
          {existing && (
            <button type="button" className="btn btn-ghost !text-danger" disabled={remove.isPending} onClick={() => confirm(`¿Borrar "${existing.name}" para siempre?`) && remove.mutate({ id: existing.id })}>Borrar</button>
          )}
          <button className="btn btn-violet flex-1" disabled={save.isPending || !!uploading}>{save.isPending ? "Guardando…" : "Guardar producto"}</button>
        </div>
      </div>
    </form>
  );
}
