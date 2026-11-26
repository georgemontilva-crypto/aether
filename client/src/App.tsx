import { lazy, Suspense, useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import { CartDrawer } from "./components/CartDrawer";
import { Intro } from "./components/Intro";
import { Shell } from "./components/Layout";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import OrderPage from "./pages/OrderPage";
import ProductPage from "./pages/ProductPage";
import Shop from "./pages/Shop";

const Admin = lazy(() => import("./admin/Admin"));

function ScrollTop() {
  const [path] = useLocation();
  // Con llaves a propósito: en navegadores nuevos scrollTo devuelve una promesa y React la tomaría por "limpieza".
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [path]);
  return null;
}

export default function App() {
  const [path] = useLocation();
  if (path.startsWith("/admin")) {
    return (
      <Suspense fallback={<div className="grid min-h-screen place-items-center"><span className="label animate-pulse">Cargando panel…</span></div>}>
        <Admin />
      </Suspense>
    );
  }
  return (
    <>
      <Intro />
      <ScrollTop />
      <Shell>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/tienda" component={Shop} />
          <Route path="/producto/:slug" component={ProductPage} />
          <Route path="/pedido/:code" component={OrderPage} />
          <Route component={NotFound} />
        </Switch>
      </Shell>
      <CartDrawer />
    </>
  );
}
