import { Link } from "wouter";
import { Mark } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="wrap flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center">
      <Mark className="w-24 text-violet" weight={6} />
      <h1 className="display text-[clamp(3rem,10vw,7rem)]">Vacío.</h1>
      <p className="max-w-sm text-muted">Esta página no existe o la pieza ya no está en el catálogo.</p>
      <Link href="/tienda" className="btn">
        Volver a la tienda
      </Link>
    </div>
  );
}
