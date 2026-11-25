import { useState, type ReactNode } from "react";
import { Link, Route, Switch, useLocation } from "wouter";
import { toggleTheme, useTheme } from "@/lib/theme";
import { errorText, trpc } from "@/lib/trpc";
import { IconMoon, IconPlus, IconSun, Mark } from "@/components/ui";
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
  const [path, navigate] = useLocation();
  const theme = useTheme();
  const utils = trpc.useUtils();
  const logout = trpc.admin.logout.useMutation({ onSuccess: () => utils.admin.invalidate() });
  const tabs = [
    { href: "/admin", label: "Inventario", on: path === "/admin" || path.startsWith("/admin/producto") },
    { href: "/admin/pedidos", label: "Pedidos", on: path === "/admin/pedidos", badge: pending },
    { href: "/admin/ajustes", label: "Ajustes", on: path === "/admin/ajustes" },
  ];
  const tabLinks = (mobile: boolean) =>
    tabs.map((t) => (
      <Link key={t.href} href={t.href} className={`relative flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-[0.14em] ${mobile ? "h-14 flex-1" : "h-16 px-1"} ${t.on ? "text-ink" : "text-muted hover:text-ink"}`}>
        {t.label}
        {!!t.badge && <span className="grid h-5 min-w-5 place-items-center bg-violet px-1 text-[10px] text-on-violet">{t.badge}</span>}
        {t.on && <span className={`absolute inset-x-0 h-0.5 bg-violet ${mobile ? "top-0" : "bottom-0"}`} />}
      </Link>
    ));

  return (
    <div className="min-h-screen pb-24 md:pb-10">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur-md">
        <div className="wrap flex h-16 items-center justify-between gap-4">
          <Link href="/admin" className="flex items-center gap-3">
            <Mark className="h-7 w-auto" weight={22} />
            <span className="label !text-ink">Panel</span>
          </Link>
          <nav className="hidden gap-8 md:flex">{tabLinks(false)}</nav>
          <div className="flex items-center gap-1">
            <a href="/" target="_blank" rel="noreferrer" className="label hidden px-2 hover:text-ink sm:block">Ver tienda ↗</a>
            <button className="grid h-11 w-11 place-items-center hover:text-violet" onClick={(e) => toggleTheme({ x: e.clientX, y: e.clientY })} aria-label="Cambiar tema">
              {theme === "dark" ? <IconSun /> : <IconMoon />}
            </button>
            <button className="label px-2 hover:text-ink" onClick={() => logout.mutate()}>Salir</button>
          </div>
        </div>
      </header>
      <main className="wrap pt-6">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-bg/95 backdrop-blur-md md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {tabLinks(true)}
      </nav>
      {path === "/admin" && (
        <button className="fixed bottom-20 right-4 z-40 grid h-14 w-14 place-items-center bg-violet text-on-violet shadow-[0_0_30px_var(--glow)] md:hidden" onClick={() => navigate("/admin/producto/nuevo")} aria-label="Nuevo producto">
          <IconPlus width={24} height={24} />
        </button>
      )}
    </div>
  );
}

export default function Admin() {
  const me = trpc.admin.me.useQuery(undefined, { staleTime: 0 });
  const data = trpc.admin.data.useQuery(undefined, { enabled: !!me.data?.admin, staleTime: 5_000, refetchInterval: (q) => (q.state.data?.storage.migration.running ? 2500 : false) });

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
