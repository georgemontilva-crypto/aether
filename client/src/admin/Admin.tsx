import { useState, type ReactNode } from "react";
import { Link, Route, Switch, useLocation } from "wouter";
import { toggleTheme, useTheme } from "@/lib/theme";
import { errorText, trpc } from "@/lib/trpc";
import { IconBox, IconGear, IconMoon, IconPlus, IconReceipt, IconSun, Mark } from "@/components/ui";
import Inventory from "./Inventory";
import Orders from "./Orders";
import ProductForm from "./ProductForm";
import Settings from "./Settings";

function Login() {
  const utils = trpc.useUtils();
  const login = trpc.admin.login.useMutation({ onSuccess: () => utils.admin.invalidate() });
  const [password, setPassword] = useState("");
  return (
    <div className="grid min-h-screen place-items-center px-5">
      <form
        className="w-full max-w-sm"
        onSubmit={(e) => {
          e.preventDefault();
          login.mutate({ password });
        }}
      >
        <Mark className="mx-auto w-16 text-violet" weight={7} />
        <h1 className="display mt-5 text-center text-5xl">Panel Aether</h1>
        <label className="mt-8 block">
          <span className="label mb-2 block">Clave del panel</span>
          <input className="field" type="password" autoFocus autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {login.error && <p className="mt-3 text-sm text-danger" role="alert">{errorText(login.error)}</p>}
        <button className="btn btn-violet mt-5 w-full" disabled={login.isPending || !password}>
          {login.isPending ? "Entrando…" : "Entrar"}
        </button>
        <Link href="/" className="label mt-6 block text-center hover:text-ink">← Volver a la tienda</Link>
      </form>
    </div>
  );
}

function Frame({ children, pending }: { children: ReactNode; pending: number }) {
  const [path] = useLocation();
  const theme = useTheme();
  const utils = trpc.useUtils();
  const logout = trpc.admin.logout.useMutation({ onSuccess: () => utils.admin.invalidate() });
  const tabs = [
    { href: "/admin", label: "Inventario", Icon: IconBox, on: path === "/admin" || /^\/admin\/producto\/\d/.test(path), badge: 0 },
    { href: "/admin/pedidos", label: "Pedidos", Icon: IconReceipt, on: path === "/admin/pedidos", badge: pending },
    { href: "/admin/producto/nuevo", label: "Nuevo", Icon: IconPlus, on: path === "/admin/producto/nuevo", badge: 0 },
    { href: "/admin/ajustes", label: "Ajustes", Icon: IconGear, on: path === "/admin/ajustes", badge: 0 },
  ];

  return (
    <div className="min-h-screen pb-28 md:pb-10">
      <header className="glass sticky top-0 z-40 !border-x-0 !border-t-0 !shadow-none" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="wrap flex h-14 items-center justify-between gap-4 md:h-16">
          <Link href="/admin" className="flex items-center gap-3">
            <Mark className="h-7 w-auto" weight={22} />
            <span className="label !text-ink">Panel</span>
          </Link>
          <nav className="hidden gap-8 md:flex">
            {tabs.filter((t) => t.label !== "Nuevo").map((t) => (
              <Link key={t.href} href={t.href} className={`relative flex h-16 items-center gap-2 px-1 font-mono text-xs uppercase tracking-[0.14em] ${t.on || (t.href === "/admin" && path === "/admin/producto/nuevo") ? "text-ink" : "text-muted hover:text-ink"}`}>
                {t.label}
                {!!t.badge && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-violet px-1 text-[10px] text-on-violet">{t.badge}</span>}
                {(t.on || (t.href === "/admin" && path === "/admin/producto/nuevo")) && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-violet" />}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <a href="/" target="_blank" rel="noreferrer" className="label px-2 hover:text-ink">Tienda ↗</a>
            <button className="grid h-11 w-11 place-items-center hover:text-violet" onClick={(e) => toggleTheme({ x: e.clientX, y: e.clientY })} aria-label="Cambiar tema">
              {theme === "dark" ? <IconSun /> : <IconMoon />}
            </button>
            <button className="label hidden h-11 px-2 hover:text-ink md:block" onClick={() => logout.mutate()}>Salir</button>
          </div>
        </div>
      </header>
      <main className="wrap pt-4 md:pt-6">{children}</main>

      {/* En el teléfono todo se maneja con el pulgar desde esta barra. */}
      <nav className="glass fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 !border-x-0 !border-b-0 !shadow-none md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} aria-label="Secciones del panel">
        {tabs.map(({ href, label, Icon, on, badge }) => (
          <Link key={href} href={href} className={`relative flex h-16 flex-col items-center justify-center gap-1 active:bg-raised ${on ? "text-violet" : "text-muted"}`} aria-current={on ? "page" : undefined}>
            <span className="relative">
              <Icon width={22} height={22} />
              {!!badge && <span className="absolute -right-3 -top-2 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-violet px-1 font-mono text-[10px] text-on-violet">{badge}</span>}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em]">{label}</span>
            {on && <span className="absolute inset-x-5 top-0 h-0.5 bg-violet" />}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export default function Admin() {
  const me = trpc.admin.me.useQuery(undefined, { staleTime: 0 });
  const data = trpc.admin.data.useQuery(undefined, { enabled: !!me.data?.admin, staleTime: 5_000, refetchOnWindowFocus: true, refetchInterval: (q) => (q.state.data?.storage.migration.running ? 2500 : 45_000) });

  if (me.isLoading) return <div className="grid min-h-screen place-items-center"><span className="label animate-pulse">Cargando…</span></div>;
  if (!me.data?.admin) return <Login />;
  if (!data.data) return <div className="grid min-h-screen place-items-center"><span className="label animate-pulse">{data.error ? errorText(data.error) : "Cargando inventario…"}</span></div>;

  return (
    <Frame pending={data.data.pendingOrders}>
      <Switch>
        <Route path="/admin">{() => <Inventory data={data.data!} />}</Route>
        <Route path="/admin/producto/nuevo">{() => <ProductForm data={data.data!} />}</Route>
        <Route path="/admin/producto/:id">{(p) => <ProductForm key={p.id} data={data.data!} id={Number(p.id)} />}</Route>
        <Route path="/admin/pedidos" component={Orders} />
        <Route path="/admin/ajustes">{() => <Settings data={data.data!} />}</Route>
        <Route>{() => <p className="py-20 text-center text-muted">Esa sección no existe.</p>}</Route>
      </Switch>
    </Frame>
  );
}
