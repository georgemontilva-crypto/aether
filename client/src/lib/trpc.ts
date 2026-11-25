import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { QueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/router";

export const trpc = createTRPCReact<AppRouter>();
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 } },
});
export const trpcClient = trpc.createClient({
  links: [httpBatchLink({ url: "/api/trpc", fetch: (url, opts) => fetch(url, { ...opts, credentials: "include" }) })],
});

type Out = inferRouterOutputs<AppRouter>;
export type Catalog = Out["shop"]["catalog"];
export type Product = Catalog["products"][number];
export type Category = Catalog["categories"][number];
export type AdminData = Out["admin"]["data"];
export type AdminOrder = Out["admin"]["orders"][number];

/** Mensaje de error legible (los de validación de zod llegan como JSON). */
export function errorText(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  try {
    const parsed = JSON.parse(msg);
    if (Array.isArray(parsed) && parsed[0]?.message) return parsed[0].message;
  } catch {
    /* no era JSON */
  }
  return msg || "Algo salió mal. Intenta de nuevo.";
}
